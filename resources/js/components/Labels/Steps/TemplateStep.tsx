import { router, useForm } from '@inertiajs/react';
import { ArrowLeft, Tag, Square, Ticket } from 'lucide-react';
import WizardStepper, {
  templateCountFor,
  wizardSteps
  
} from '@/components/Labels/WizardStepper';
import type {WizardCategories} from '@/components/Labels/WizardStepper';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';
import type { LabelTemplateType } from '@/types/labels';

const TEMPLATE_TYPE_OPTIONS: { value: LabelTemplateType; label: string; description: string; icon: typeof Tag }[] = [
  { value: 'napkin', label: 'Наклейка (салфетки)', description: 'Стандартная наклейка для салфеток', icon: Tag },
  { value: 'mat', label: 'Наклейки коврики', description: 'Наклейка для ковриков', icon: Square },
  { value: 'tag', label: 'Бирки', description: 'Подвесная бирка', icon: Ticket },
];

interface Session {
  id: string;
  category: string | null;
}

interface Props {
  session: Session;
  categories: WizardCategories;
}

interface TemplateForm {
  session_id: string;
  template_type: LabelTemplateType | null;
}

export default function TemplateStep({ session, categories }: Props) {
  const { data, setData, post, processing } = useForm<TemplateForm>({
    session_id: session.id,
    template_type: null,
  });

  const allowedTemplates = session.category
    ? categories?.[session.category]?.templates
    : undefined;

  const options = allowedTemplates
    ? TEMPLATE_TYPE_OPTIONS.filter((opt) => allowedTemplates.includes(opt.value))
    : TEMPLATE_TYPE_OPTIONS;

  const steps = wizardSteps(templateCountFor(categories, session.category));

  const gridColumns =
    options.length === 1
      ? 'sm:grid-cols-1'
      : options.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-3';

  const handleBack = () =>
    router.get(labels.index({ query: { session: session.id, step: 2 } }).url);
  const handleNext = () => post(labels.selectTemplate().url, { preserveScroll: true });

  return (
    <div className="space-y-10">

      <WizardStepper steps={steps} currentId={3} />

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
          Выбор шаблона
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
          Выберите тип этикетки для генерации
        </p>
      </div>

      {/* Template type selector */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg)] dark:text-zinc-100">
          Тип этикетки
        </h2>
        <div className={cn('grid grid-cols-1 gap-3', gridColumns)}>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = data.template_type === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setData('template_type', opt.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/10 bg-[var(--color-accent)]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    isSelected
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--color-muted)]',
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-fg)] dark:text-zinc-100">
                    {opt.label}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] dark:text-zinc-400">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 px-6 py-2.5 text-sm font-medium text-[var(--color-fg)] dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="size-4" />
          Назад
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!data.template_type || processing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-all',
            data.template_type && !processing
              ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
              : 'bg-zinc-200 dark:bg-zinc-800 text-[var(--color-muted)] dark:text-zinc-500 cursor-not-allowed opacity-50',
          )}
        >
          {processing ? 'Сохранение...' : 'Далее'}
        </button>
      </div>
    </div>
  );
}
