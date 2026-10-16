import { router, useForm } from '@inertiajs/react';
import { Tag, Square, Ticket } from 'lucide-react';
import { useWizardNav } from '@/components/Labels/FohoShell';
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

  const gridColumns =
    options.length === 1
      ? 'sm:grid-cols-1'
      : options.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-3';

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
    nextDisabled: !data.template_type || processing,
  });

  return (
    <div className="space-y-10">

      {/* Heading */}
      <div>
        <p className="text-sm text-[var(--color-muted)]">
          Выберите тип этикетки для генерации
        </p>
      </div>

      {/* Template type selector */}
      <div className="rounded-xl border border-zinc-200 bg-[var(--color-surface)] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg)]">
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
                    : 'border-zinc-200 hover:border-zinc-300',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    isSelected
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-zinc-100 text-[var(--color-muted)]',
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-fg)]">
                    {opt.label}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
