import { router } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
    useGenerationScene,
    useReadyScene,
    useSceneTransition,
    useWizardNav,
} from '@/components/Labels/FohoShell';
import PdfEngine from '@/components/Labels/PdfEngine';
import type { LabelMode } from '@/components/Labels/TagLabelDocument';
import VolumeScene from '@/components/Labels/VolumeScene';
import { decideModes } from '@/lib/labelFit';
import labels from '@/routes/labels';
import type {
    LabelData,
    LabelTemplateType,
    LabelsDownloadResponse,
} from '@/types/labels';

interface Props {
    sessionId: string;
    templateCount: number | null;
    /**
     * True while the export step is shown optimistically (under the closing
     * transition layers) but the wizard request that saves the template has
     * not answered yet. The generation scene is already on screen; the PDF
     * request waits for that confirmation instead of racing it, so it never
     * compiles with a stale template.
     */
    awaitingServer?: boolean;
}

type Status = 'fetching' | 'compiling' | 'ready' | 'error';

interface ImportErrorBody {
    error?: string;
    error_code?: string;
    importer_card_url?: string;
    details?: string[];
}

/**
 * Captions follow the real stages of creation instead of the package demo
 * timers (2.3 / 4.8 / 7.2 s): the request starts on «pages», the PDF engine
 * reports «assembling», and the blob finishing switches to «finishing» right
 * before the ready transition. Errors never reach the ready screen.
 */
const GENERATION_MESSAGES = [
    'Подготавливаем страницы',
    'Собираем этикетки в PDF',
    'Завершаем создание файла',
];

const docIcon = (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        aria-hidden="true"
    >
        <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" />
    </svg>
);

function pluralize(
    count: number,
    forms: [one: string, few: string, many: string],
): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return forms[0];
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return forms[1];
    }

    return forms[2];
}

function GenerationCaption({ index }: { index: number }): ReactNode {
    const message = GENERATION_MESSAGES[index] ?? GENERATION_MESSAGES[0];

    return (
        <>
            <span className="generation-message" key={index}>
                {message.split(' ').map((word, wordIndex) => (
                    <Fragment key={wordIndex}>
                        {wordIndex > 0 ? ' ' : null}
                        <span style={{ '--word': wordIndex } as CSSProperties}>
                            {word}
                        </span>
                    </Fragment>
                ))}
            </span>
            <span className="generation-pulses" aria-hidden="true">
                {GENERATION_MESSAGES.map((_, pulseIndex) => (
                    <i
                        key={pulseIndex}
                        className={
                            pulseIndex === index
                                ? 'active'
                                : pulseIndex < index
                                  ? 'complete'
                                  : ''
                        }
                    />
                ))}
            </span>
        </>
    );
}

export default function ExportStep({
    sessionId,
    templateCount,
    awaitingServer = false,
}: Props) {
    const [status, setStatus] = useState<Status>('fetching');
    const [labelsData, setLabelsData] = useState<LabelData[] | null>(null);
    const [templateType, setTemplateType] =
        useState<LabelTemplateType>('napkin');
    const [modes, setModes] = useState<LabelMode[] | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorCardUrl, setErrorCardUrl] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [readyShown, setReadyShown] = useState(false);
    const [fetchKey, setFetchKey] = useState(0);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const readyRanRef = useRef(false);

    const scene = useSceneTransition();

    const backStep = templateCount === 1 ? 2 : 3;
    const backLabel =
        templateCount === 1 ? 'Назад к аудиту' : 'Назад к шаблону';

    const fileName = `foho_labels_${sessionId}.pdf`;

    const handleBack = () =>
        router.get(
            `/labels?session=${sessionId}&step=${backStep}`,
            {},
            {
                preserveState: true,
            },
        );

    useWizardNav({
        back: handleBack,
        backLabel,
    });

    const creating =
        status === 'fetching' ||
        status === 'compiling' ||
        (status === 'ready' && !readyShown);

    useGenerationScene(creating);
    useReadyScene(readyShown && status === 'ready');

    // «Готовность» — тот же стандартный переход, подпись «Скачать PDF»;
    // сама сцена меняется под слоями в момент onSwap.
    useEffect(() => {
        if (status !== 'ready' || readyRanRef.current) {
            return;
        }

        readyRanRef.current = true;
        scene.run({
            stepId: 4,
            label: 'Скачать PDF',
            onSwap: () => setReadyShown(true),
        });
    }, [status, scene]);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (awaitingServer) {
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        async function run() {
            setStatus('fetching');
            setErrorMessage(null);
            setErrorCardUrl(null);
            setErrorDetails([]);
            setLabelsData(null);
            setModes(null);

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
                setObjectUrl(null);
            }

            try {
                const res = await fetch(
                    `/labels/download?session_id=${sessionId}`,
                    { signal: controller.signal },
                );

                if (cancelled) {
                    return;
                }

                if (!res.ok) {
                    const body: ImportErrorBody | null = await res
                        .json()
                        .catch(() => null);

                    if (body?.importer_card_url) {
                        setErrorCardUrl(body.importer_card_url);
                    }

                    if (Array.isArray(body?.details)) {
                        setErrorDetails(body.details);
                    }

                    throw new Error(
                        body?.error ?? `Ошибка сервера: ${res.status}`,
                    );
                }

                const data: LabelsDownloadResponse = await res.json();

                if (cancelled) {
                    return;
                }

                if (!data.labels || data.labels.length === 0) {
                    throw new Error('Нет этикеток для экспорта.');
                }

                if (!data.importer) {
                    throw new Error(
                        'Реквизиты импортёра не получены. Заполните карточку импортёра, чтобы сформировать этикетки.',
                    );
                }

                setLabelsData(data.labels);
                setTemplateType(data.template_type ?? 'napkin');
                setStatus('compiling');
            } catch (e) {
                if (cancelled) {
                    return;
                }

                const message =
                    e instanceof Error ? e.message : 'Неизвестная ошибка';
                setErrorMessage(message);
                setStatus('error');
            }
        }

        run();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [sessionId, fetchKey, awaitingServer]);

    // Подготовка бирок: проверяем фактическое нижнее поле dataCol и выбираем
    // normal/compact до монтирования PdfEngine. Устаревший результат при смене
    // данных отбрасывается флагом cancelled.
    useEffect(() => {
        if (!labelsData || templateType !== 'tag') {
            return;
        }

        let cancelled = false;

        decideModes(labelsData)
            .then((result) => {
                if (cancelled) {
                    return;
                }

                if (result.errorSkus.length > 0) {
                    setErrorMessage(
                        'Часть бирок не помещается на лист 712×419 даже в компактном режиме. Проверьте данные этих артикулов:',
                    );
                    setErrorCardUrl(null);
                    setErrorDetails(result.errorSkus);
                    setStatus('error');

                    return;
                }

                setModes(result.modes);
            })
            .catch((e) => {
                if (cancelled) {
                    return;
                }

                setErrorMessage(
                    e instanceof Error ? e.message : 'Неизвестная ошибка',
                );
                setErrorCardUrl(null);
                setErrorDetails([]);
                setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [labelsData, templateType]);

    const handleBlobReady = useCallback((b: Blob) => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = URL.createObjectURL(b);
        setObjectUrl(objectUrlRef.current);
        setStatus('ready');
    }, []);

    const handleGenerateError = useCallback((message: string) => {
        setErrorMessage(message);
        setErrorCardUrl(null);
        setErrorDetails([]);
        setStatus('error');
    }, []);

    const handleNewBatch = () => {
        scene.run({ stepId: 1, hold: true });

        router.get(
            labels.index({ query: { step: 1 } }).url,
            {},
            { preserveState: true },
        );
    };

    const count = labelsData?.length ?? 0;
    const captionIndex =
        status === 'fetching' ? 0 : status === 'compiling' ? 1 : 2;

    if (status === 'error') {
        return (
            <section className="export-summary" role="alert">
                <div className="export-summary-top">
                    <div className="file-icon">
                        <AlertCircle />
                    </div>
                    <div>
                        <h2>Не удалось сформировать PDF</h2>
                        <p className="error" role="alert">
                            {errorMessage}
                        </p>
                    </div>
                </div>

                {errorDetails.length > 0 && !errorCardUrl && (
                    <ul className="row-errors">
                        {errorDetails.map((detail) => (
                            <li key={detail}>{detail}</li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
                    {errorCardUrl && (
                        <a className="primary" href={errorCardUrl}>
                            Заполнить карточку импортёра{' '}
                            <span aria-hidden="true">↗</span>
                        </a>
                    )}
                    {!errorCardUrl && errorDetails.length > 0 && (
                        <a
                            className="primary"
                            href={`/labels?session=${sessionId}&step=2`}
                        >
                            Перейти к аудиту <span aria-hidden="true">↗</span>
                        </a>
                    )}
                    <button
                        type="button"
                        className={
                            errorCardUrl || errorDetails.length > 0
                                ? 'text-link'
                                : 'primary'
                        }
                        onClick={() => setFetchKey((k) => k + 1)}
                    >
                        Повторить
                        {errorCardUrl || errorDetails.length > 0 ? ' ↗' : ''}
                    </button>
                </div>
            </section>
        );
    }

    if (readyShown) {
        return (
            <>
                <section className="ready-layout">
                    <div className="ready-art">
                        <VolumeScene mode="ready" />
                    </div>
                    <div className="ready-copy">
                        <span className="overline">Файл подготовлен</span>
                        <h2 className="step-heading" tabIndex={-1}>
                            Можно скачивать
                        </h2>
                        <p>
                            {count}{' '}
                            {pluralize(count, [
                                'этикетка',
                                'этикетки',
                                'этикеток',
                            ])}{' '}
                            {pluralize(count, [
                                'собрана',
                                'собраны',
                                'собраны',
                            ])}{' '}
                            в один PDF.
                        </p>
                    </div>
                    <div className="download-card">
                        <div className="file-icon">{docIcon}</div>
                        <div className="download-info">
                            <strong>{fileName}</strong>
                            <span>
                                PDF · {count}{' '}
                                {pluralize(count, [
                                    'страница',
                                    'страницы',
                                    'страниц',
                                ])}
                            </span>
                        </div>
                        {objectUrl && (
                            <a
                                className="primary download-now"
                                href={objectUrl}
                                download={fileName}
                            >
                                Скачать PDF <span aria-hidden="true">↓</span>
                            </a>
                        )}
                    </div>
                    <button
                        type="button"
                        className="text-link new-batch"
                        onClick={handleNewBatch}
                    >
                        Создать новый пакет ↗
                    </button>
                </section>
            </>
        );
    }

    return (
        <>
            <section className="generation-scene" aria-label="Создание PDF">
                <VolumeScene mode="generating" />
                <div
                    className="generation-caption"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <GenerationCaption index={captionIndex} />
                </div>
            </section>

            {labelsData &&
                status === 'compiling' &&
                (templateType !== 'tag' || modes !== null) && (
                    <PdfEngine
                        labels={labelsData}
                        templateType={templateType}
                        modes={modes}
                        onReady={handleBlobReady}
                        onError={handleGenerateError}
                    />
                )}
        </>
    );
}
