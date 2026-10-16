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
        <ol
            className="steps"
            aria-label="Этапы подготовки"
            style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
        >
            {steps.map((step, index) => {
                const isCompleted = index < activeIndex;
                const isActive = index === activeIndex;

                return (
                    <li
                        key={step.id}
                        className={cn(
                            isCompleted && 'done',
                            isActive && 'current',
                        )}
                        aria-current={isActive ? 'step' : undefined}
                    >
                        <button type="button" disabled>
                            <span className="step-number">
                                {isCompleted ? '✓' : index + 1}
                            </span>
                            {step.label}
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
