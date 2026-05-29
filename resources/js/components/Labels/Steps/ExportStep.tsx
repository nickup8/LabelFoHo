import { useEffect, useState, useCallback } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ArrowLeft, Download, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import FoHoLabelDocument from '@/components/Labels/FoHoLabelDocument';
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

export default function ExportStep({ sessionId }: Props) {
    const [labels, setLabels] = useState<LabelData[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLabels = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/labels/download?session_id=${sessionId}`);

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(
                    body?.error ?? `Ошибка сервера: ${res.status}`,
                );
            }

            const data: LabelsDownloadResponse = await res.json();

            if (!data.labels || data.labels.length === 0) {
                throw new Error('Нет этикеток для экспорта.');
            }

            setLabels(data.labels);
        } catch (e) {
            const message =
                e instanceof Error ? e.message : 'Неизвестная ошибка';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchLabels();
    }, [fetchLabels]);

    const fileName = `foho_labels_${sessionId}.pdf`;

    return (
        <div className="mx-auto max-w-2xl space-y-10 py-12">
            {/* Шаги */}
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

            {/* Загрузка */}
            {loading && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <Loader2 className="size-10 animate-spin text-[var(--color-accent)]" />
                    <p className="text-sm text-[var(--color-muted)] dark:text-zinc-400">
                        Загружаем данные этикеток...
                    </p>
                </div>
            )}

            {/* Ошибка */}
            {!loading && error && (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <AlertCircle className="size-12 text-red-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                            Ошибка загрузки
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)] dark:text-zinc-400">
                            {error}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchLabels}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
                    >
                        <Loader2 className="size-4" />
                        Повторить
                    </button>
                </div>
            )}

            {/* Успех: данные загружены */}
            {!loading && !error && labels && (
                <>
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500 dark:text-green-400" />
                        <h1 className="text-3xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
                            Этикетки готовы
                        </h1>
                        <p className="mt-2 text-base text-[var(--color-muted)] dark:text-zinc-400">
                            Обработано{' '}
                            <span className="font-semibold text-[var(--color-fg)] dark:text-zinc-200">
                                {labels.length}
                            </span>{' '}
                            {labels.length === 1
                                ? 'этикетка'
                                : labels.length >= 2 && labels.length <= 4
                                  ? 'этикетки'
                                  : 'этикеток'}
                        </p>
                    </div>

                    {/* Карточка файла с кнопкой скачивания */}
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
                                    PDF • {labels.length}{' '}
                                    {labels.length === 1
                                        ? 'страница'
                                        : 'страниц'}
                                </p>
                            </div>
                        </div>

                        <PDFDownloadLink
                            document={<FoHoLabelDocument labels={labels} />}
                            fileName={fileName}
                            className={cn(
                                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all sm:w-auto',
                                'bg-[var(--color-accent)] hover:opacity-90',
                            )}
                        >
                            {({ loading: pdfLoading }) =>
                                pdfLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Генерируем PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="size-4" />
                                        Скачать PDF
                                    </>
                                )
                            }
                        </PDFDownloadLink>
                    </div>

                    {/* Сброс -> новый пакет */}
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
        </div>
    );
}
