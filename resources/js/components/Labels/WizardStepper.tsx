import { cn } from '@/lib/utils';

export interface WizardCategory {
    label: string;
    templates: string[];
}

export type WizardCategories =
    | Record<string, WizardCategory | undefined>
    | null
    | undefined;

export interface WizardStep {
    id: number;
    label: string;
}

export function templateCountFor(
    categories: WizardCategories,
    category: string | null,
): number | null {
    if (!categories || !category) {
        return null;
    }

    const definition = categories[category];

    return definition ? definition.templates.length : null;
}

export function wizardSteps(templateCount: number | null): WizardStep[] {
    if (templateCount === 1) {
        return [
            { id: 1, label: 'Загрузка' },
            { id: 2, label: 'Аудит' },
            { id: 4, label: 'Экспорт' },
        ];
    }

    return [
        { id: 1, label: 'Загрузка' },
        { id: 2, label: 'Аудит' },
        { id: 3, label: 'Шаблон' },
        { id: 4, label: 'Экспорт' },
    ];
}

interface WizardStepperProps {
    steps: WizardStep[];
    currentId: number;
}

export default function WizardStepper({ steps, currentId }: WizardStepperProps) {
    const activeIndex = steps.findIndex((step) => step.id === currentId);

    return (
        <nav aria-label="Прогресс" className="relative">
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < activeIndex;
                    const isActive = index === activeIndex;

                    return (
                        <div
                            key={step.id}
                            className="relative flex flex-col items-center bg-[var(--color-bg)] dark:bg-zinc-900 px-4"
                        >
                            <div
                                className={cn(
                                    'flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                                    isCompleted && 'bg-green-500 text-white',
                                    isActive && 'bg-[var(--color-accent)] text-white',
                                    !isCompleted &&
                                        !isActive &&
                                        'bg-zinc-100 dark:bg-zinc-800 text-[var(--color-muted)] dark:text-zinc-400',
                                )}
                            >
                                {isCompleted ? '✓' : index + 1}
                            </div>
                            <span
                                className={cn(
                                    'mt-2 text-xs font-medium',
                                    isCompleted && 'text-green-600 dark:text-green-400',
                                    isActive && 'text-[var(--color-fg)] dark:text-zinc-100',
                                    !isCompleted &&
                                        !isActive &&
                                        'text-[var(--color-muted)] dark:text-zinc-400',
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
