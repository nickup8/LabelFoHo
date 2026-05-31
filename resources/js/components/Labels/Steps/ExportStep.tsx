import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Download,
    FileText,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    LoaderCircle,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PdfEngine from '@/components/Labels/PdfEngine';
import type { LabelData, LabelsDownloadResponse } from '@/types/labels';

const STEPS = [
    { id: 1, label: 'Загрузка' },
    { id: 2, label: 'Аудит' },
    { id: 3, label: 'Шаблон' },
    { id: 4, label: 'Просмотр' },
    { id: 5, label: 'Экспорт' },
] as const;

interface Props {
    sessionId: string;
}

function GeneratingOverlay({ compiling }: { compiling: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-24">
            <div className="relative flex items-center justify-center">
                <LoaderCircle className="size-16 animate-spin text-[var(--color-accent)]" />
                <div className="absolute animate-spin [animation-direction:reverse]">
                    <ChevronDown className="size-6 text-[var(--color-accent)]/80" />
                </div>
            </div>
            <p className="mt-8 text-sm text-[var(--color-muted)] dark:text-zinc-400 animate-pulse text-center max-w-xs">
                {compiling
                    ? 'Браузер компилирует PDF-страницы... Пожалуйста, не закрывайте вкладку'
                    : 'Загружаем данные этикеток...'}
            </p>
        </div>
    );
}

export default function ExportStep({ sessionId }: Props) {
    const [status, setStatus] = useState<'fetching' | 'compiling' | 'ready' | 'error'>('fetching');
    const [labels, setLabels] = useState<LabelData[] | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fetchKey, setFetchKey] = useState(0);
    const objectUrlRef = useRef<string | null>(null);

    const fileName = `foho_labels_${sessionId}.pdf`;

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setStatus('fetching');
            setErrorMessage(null);
            setLabels(null);

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            try {
                const res = await fetch(`/labels/download?session_id=${sessionId}`);

                if (cancelled) return;

                if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(
                        body?.error ?? `Ошибка сервера: ${res.status}`,
                    );
                }

                const data: LabelsDownloadResponse = await res.json();

                if (cancelled) return;

                if (!data.labels || data.labels.length === 0) {
                    throw new Error('Нет этикеток для экспорта.');
                }

                setLabels(data.labels);
                setStatus('compiling');
            } catch (e) {
                if (cancelled) return;
                const message =
                    e instanceof Error ? e.message : 'Неизвестная ошибка';
                setErrorMessage(message);
                setStatus('error');
            }
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [sessionId, fetchKey]);

    const handleBlobReady = useCallback((b: Blob) => {
        objectUrlRef.current = URL.createObjectURL(b);
        setStatus('ready');
    }, []);

    const count = labels?.length ?? 0;

    return (
        <div className="mx-auto max-w-2xl space-y-10 py-12">
            <nav aria-label="Прогресс" className="relative">
                <div className="absolute top-5 right-0 left-0 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex items-center justify-between">
                    {STEPS.map((s) => {
                        const isCompleted = s.id <= 4;
                        const isActive = s.id === 5;

                        return (
                            <div
                                key={s.id}
                                className="relative flex flex-col items-center bg-[var(--color-bg)] px-4 dark:bg-zinc-900"
                            >
                                <div
                                    className={cn(
                                        'flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                                        isCompleted &&
                                            'bg-green-500 text-white',
                                        isActive &&
                                            'bg-[var(--color-accent)] text-white',
                                        !isCompleted &&
                                            !isActive &&
                                            'bg-zinc-100 text-[var(--color-muted)] dark:bg-zinc-800 dark:text-zinc-400',
                                    )}
                                >
                                    {isCompleted ? '✓' : s.id}
                                </div>
                                <span
                                    className={cn(
                                        'mt-2 text-xs font-medium',
                                        isCompleted &&
                                            'text-green-600 dark:text-green-400',
                                        isActive &&
                                            'text-[var(--color-fg)] dark:text-zinc-100',
                                        !isCompleted &&
                                            !isActive &&
                                            'text-[var(--color-muted)] dark:text-zinc-400',
                                    )}
                                >
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </nav>

            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
                    <FileText className="size-5 text-[var(--color-accent)]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
                        {status === 'ready'
                            ? 'Этикетки готовы'
                            : 'Экспорт PDF'}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
                        {status === 'fetching' && 'Загрузка данных...'}
                        {status === 'compiling' && 'Компиляция PDF...'}
                        {status === 'ready' &&
                            `Файл готов к скачиванию (${count} ${count === 1 ? 'этикетка' : count >= 2 && count <= 4 ? 'этикетки' : 'этикеток'})`}
                        {status === 'error' && 'Произошла ошибка'}
                    </p>
                </div>
            </div>

            {(status === 'fetching' || status === 'compiling') && (
                <div className="border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900/50 rounded-xl">
                    <GeneratingOverlay compiling={status === 'compiling'} />
                </div>
            )}

            {status === 'ready' && objectUrlRef.current && (
                <>
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500 dark:text-green-400" />
                        <h2 className="text-3xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
                            PDF скомпилирован
                        </h2>
                        <p className="mt-2 text-base text-[var(--color-muted)] dark:text-zinc-400">
                            Обработано{' '}
                            <span className="font-semibold text-[var(--color-fg)] dark:text-zinc-200">
                                {count}
                            </span>{' '}
                            {count === 1
                                ? 'этикетка'
                                : count >= 2 && count <= 4
                                  ? 'этикетки'
                                  : 'этикеток'}
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-[var(--color-surface)] p-6 shadow-sm sm:flex-row dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center gap-4">
                            <div className="rounded-xl bg-red-50 p-3 text-red-500 dark:bg-red-950/30 dark:text-red-400">
                                <FileText className="size-6" />
                            </div>
                            <div>
                                <h3 className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    {fileName}
                                </h3>
                                <p className="text-xs text-[var(--color-muted)] dark:text-zinc-400">
                                    PDF • {count}{' '}
                                    {count === 1 ? 'страница' : 'страниц'}
                                </p>
                            </div>
                        </div>

                        <a
                            href={objectUrlRef.current}
                            download={fileName}
                            className={cn(
                                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all sm:w-auto',
                                'bg-[var(--color-accent)] hover:opacity-90',
                            )}
                        >
                            <Download className="size-4" />
                            Скачать PDF
                        </a>
                    </div>

                    <div className="text-center">
                        <a
                            href="/labels?step=1"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
                        >
                            <ArrowLeft className="size-4" />
                            Создать новый пакет
                        </a>
                    </div>
                </>
            )}

            {status === 'error' && (
                <div className="border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900/50 rounded-xl p-8">
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <AlertCircle className="size-12 text-red-500" />
                        <div>
                            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                                Ошибка загрузки
                            </h2>
                            <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)] dark:text-zinc-400">
                                {errorMessage}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFetchKey((k) => k + 1)}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
                        >
                            <Download className="size-4" />
                            Повторить
                        </button>
                    </div>
                </div>
            )}

            {labels && (
                <PdfEngine labels={labels} onReady={handleBlobReady} />
            )}
        </div>
    );
}
