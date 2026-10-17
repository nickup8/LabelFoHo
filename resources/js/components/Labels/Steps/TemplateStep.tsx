import { router, useForm } from '@inertiajs/react';
import { useCallback, useRef } from 'react';
import { useWizardNav } from '@/components/Labels/FohoShell';
import type { WizardCategories } from '@/components/Labels/WizardStepper';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';
import type { LabelTemplateType } from '@/types/labels';

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

interface TemplateVisual {
    title: string;
    description: string;
    /** Package art: `mat` reuses the sticker drawing. */
    art: 'sticker' | 'tag';
}

const TEMPLATE_VISUALS: Record<LabelTemplateType, TemplateVisual> = {
    napkin: {
        title: 'Наклейки салфетки',
        description: 'Наклейка для салфеток',
        art: 'sticker',
    },
    mat: {
        title: 'Наклейки коврики',
        description: 'Вертикальные наклейки',
        art: 'sticker',
    },
    tag: {
        title: 'Бирки',
        description: 'Горизонтальные бирки',
        art: 'tag',
    },
};

interface ValidationRow {
    row: number;
}

interface Session {
    id: string;
    category: string | null;
    validation_results?: ValidationRow[];
}

interface Props {
    session: Session;
    categories: WizardCategories;
}

interface TemplateForm {
    session_id: string;
    template_type: LabelTemplateType | null;
}

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

function StickerArt() {
    return (
        <div className="sticker-shape">
            <i />
            <i />
            <i />
        </div>
    );
}

function TagArt() {
    return (
        <div className="tag-shape">
            <i />
            <i />
            <i />
        </div>
    );
}

export default function TemplateStep({ session, categories }: Props) {
    const { data, setData, post, processing } = useForm<TemplateForm>({
        session_id: session.id,
        template_type: null,
    });

    const choicesRef = useRef<HTMLDivElement>(null);

    const allowedTemplates = session.category
        ? categories?.[session.category]?.templates
        : undefined;

    const options: LabelTemplateType[] =
        allowedTemplates && allowedTemplates.length > 0
            ? (allowedTemplates as LabelTemplateType[])
            : ['napkin', 'tag'];

    const categoryLabel = session.category
        ? (categories?.[session.category]?.label ?? session.category)
        : '';
    const rowCount = session.validation_results?.length ?? 0;

    const focusChoice = useCallback((value: LabelTemplateType) => {
        const choices =
            choicesRef.current?.querySelectorAll<HTMLElement>(
                '[data-template]',
            ) ?? [];

        choices.forEach((choice) => {
            if (choice.getAttribute('data-template') === value) {
                choice.focus();
            }
        });
    }, []);

    const handleBack = () =>
        router.get(
            labels.index({ query: { session: session.id, step: 2 } }).url,
            {},
            { preserveState: true },
        );

    const handleNext = () =>
        post(labels.selectTemplate().url, {
            preserveScroll: true,
            preserveState: true,
        });

    useWizardNav({
        back: handleBack,
        next: handleNext,
        nextLabel: 'К экспорту',
        nextDisabled: !data.template_type || processing,
    });

    return (
        <div>
            <div className="template-intro">
                <span className="overline">Тип этикетки</span>
                <span className="quiet">
                    {categoryLabel} · {rowCount}{' '}
                    {pluralize(rowCount, ['товар', 'товара', 'товаров'])}
                </span>
            </div>

            <div
                ref={choicesRef}
                className="template-choices"
                role="radiogroup"
                aria-label="Тип этикетки"
            >
                {options.map((value, index) => {
                    const visual = TEMPLATE_VISUALS[value];
                    const isSelected = data.template_type === value;

                    if (!visual) {
                        return null;
                    }

                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            data-template={value}
                            tabIndex={
                                isSelected ||
                                (!data.template_type && index === 0)
                                    ? 0
                                    : -1
                            }
                            className={cn(
                                'template-choice',
                                isSelected && 'selected',
                            )}
                            onClick={() => setData('template_type', value)}
                            onKeyDown={(event) => {
                                if (!ARROW_KEYS.includes(event.key)) {
                                    return;
                                }

                                event.preventDefault();

                                const nextIndex =
                                    index === options.length - 1
                                        ? 0
                                        : index + 1;
                                const nextValue = options[nextIndex];

                                setData('template_type', nextValue);
                                focusChoice(nextValue);
                            }}
                        >
                            <div
                                className={cn('template-art', visual.art)}
                                aria-hidden="true"
                            >
                                {visual.art === 'sticker' ? (
                                    <StickerArt />
                                ) : (
                                    <TagArt />
                                )}
                            </div>
                            <div className="template-copy">
                                <strong>{visual.title}</strong>
                                <span>{visual.description}</span>
                            </div>
                            <span className="choice-check" aria-hidden="true">
                                {isSelected ? '✓' : '↗'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
