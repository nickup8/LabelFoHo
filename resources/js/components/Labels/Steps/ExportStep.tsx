import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    Sparkles,
    Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
    { id: 1, label: 'Загрузка' },
    { id: 2, label: 'Аудит' },
    { id: 3, label: 'Шаблон' },
    { id: 4, label: 'Просмотр' },
    { id: 5, label: 'Экспорт' },
] as const;

const STATUSES = [
    'ИИ анализирует макет...',
    'Компонуем этикетки...',
    'Финальный рендеринг PDF...',
] as const;

export default function ExportStep() {
    const [isGenerating, setIsGenerating] = useState(true);
    const [statusIdx, setStatusIdx] = useState(0);

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session') || 'output';
    const fileName = `foho_labels_${sessionId}.pdf`;

    useEffect(() => {
        const timer = setTimeout(() => setIsGenerating(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isGenerating) return;
        const iv = setInterval(() => {
            setStatusIdx((p) => (p + 1) % STATUSES.length);
        }, 1200);
        return () => clearInterval(iv);
    }, [isGenerating]);

    return (
        <div className="mx-auto max-w-2xl space-y-10 py-12">
            {/* Stepper */}
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

            {isGenerating ? (
                /* AI Magic loading */
                <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
                    <div className="relative">
                        <Wand2 className="size-16 animate-pulse bg-gradient-to-r from-purple-500 to-[var(--color-accent)] bg-clip-text text-transparent" />
                        <Sparkles className="absolute -top-2 -right-2 size-10 animate-spin text-purple-400" />
                        <Sparkles
                            className="absolute -bottom-1 -left-3 size-10 animate-spin text-[var(--color-accent)]"
                            style={{ animationDirection: 'reverse' }}
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)] dark:text-zinc-100">
                            Магия FoHo AI...
                        </h1>
                        <p className="mt-3 max-w-sm text-sm text-[var(--color-muted)] transition-all duration-300 dark:text-zinc-400">
                            {STATUSES[statusIdx]}
                        </p>
                    </div>
                </div>
            ) : (
                /* Success state */
                <>
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500 dark:text-green-400" />
                        <h1 className="text-3xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
                            Готово! PDF сформирован
                        </h1>
                        <p className="mt-2 text-base text-[var(--color-muted)] dark:text-zinc-400">
                            Ваш файл с этикетками успешно сгенерирован и готов к
                            печати
                        </p>
                    </div>

                    {/* File card */}
                    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-[var(--color-surface)] p-6 text-left shadow-sm sm:flex-row dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center gap-4">
                            <div className="rounded-xl bg-red-50 p-3 text-red-500 dark:bg-red-950/30 dark:text-red-400">
                                <FileText className="size-6" />
                            </div>
                            <div>
                                <h3 className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    {fileName}
                                </h3>
                                <p className="text-xs text-[var(--color-muted)] dark:text-zinc-400">
                                    PDF Документ • Этикетки готовы к печати
                                </p>
                            </div>
                        </div>

                        <a
                            href={`/labels/download?session_id=${sessionId}`}
                            download={fileName}
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-95 sm:w-auto"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Download className="size-4" />
                            Скачать файл
                        </a>
                    </div>

                    {/* Reset link */}
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
