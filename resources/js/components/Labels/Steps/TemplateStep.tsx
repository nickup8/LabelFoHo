import { router, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Columns, Grid, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';

const STEPS = [
  { id: 1, label: 'Загрузка' },
  { id: 2, label: 'Аудит' },
  { id: 3, label: 'Шаблон' },
  { id: 4, label: 'Просмотр' },
  { id: 5, label: 'Экспорт' },
] as const;

interface Template {
  name: string;
  description: string;
  orientation: string;
  page_width_mm: number;
  page_height_mm: number;
  font_family: string;
  columns_mapping: Record<string, string>;
  sections: Record<string, { y_mm: number; height_mm: number }>;
  fields: Record<string, Record<string, unknown>>;
  static: {
    trademark: string;
    importer: string;
    certification_marks: string[];
    manufacturer_default: string;
  };
}

interface Session {
  id: string;
  template_id: string | null;
}

interface Props {
  session: Session;
  templates: Record<string, Template>;
}

interface TemplateForm {
  session_id: string;
  template_id: string;
}

function TemplatePreview({ template }: { template: Template }) {
  const isVertical = template.orientation === 'vertical';
  const s = template.static;

  if (isVertical) {
    return (
      <div className="w-24 h-16 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded p-2 flex flex-col justify-between shadow-sm">
        <div className="w-8 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
        <div className="space-y-1">
          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="w-2/3 h-1 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
        <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-500 flex items-center justify-center text-[6px] font-mono text-zinc-400 dark:text-zinc-500">
          ||||||||||
        </div>
      </div>
    );
  }

  return (
    <div className="w-36 h-10 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded p-2 flex items-center justify-between shadow-sm">
      <div className="space-y-1 w-1/2">
        <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
        <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="w-3/4 h-1 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
      <div className="w-10 h-full bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-500 flex items-center justify-center text-[6px] font-mono tracking-tighter text-zinc-400 dark:text-zinc-500">
        ||||||
      </div>
    </div>
  );
}

export default function TemplateStep({ session, templates }: Props) {
  const templateIds = Object.keys(templates);

  const { data, setData, post, processing } = useForm<TemplateForm>({
    session_id: session.id,
    template_id: session.template_id ?? '',
  });

  const handleSelect = (id: string) => setData('template_id', id);
  const handleBack = () =>
    router.get(labels.index({ query: { session: session.id, step: 2 } }).url);
  const handleNext = () => post(labels.selectTemplate().url, { preserveScroll: true });

  const hasSelection = !!data.template_id;

  return (
    <div className="space-y-10">

      {/* Stepper */}
      <nav aria-label="Прогресс" className="relative">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center justify-between">
          {STEPS.map((s) => {
            const isCompleted = s.id === 1 || s.id === 2;
            const isActive = s.id === 3;

            return (
              <div
                key={s.id}
                className="relative flex flex-col items-center bg-[var(--color-bg)] dark:bg-zinc-900 px-4"
              >
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isCompleted && 'bg-green-500 text-white',
                    isActive && 'bg-[var(--color-accent)] text-white',
                    !isCompleted && !isActive && 'bg-zinc-100 dark:bg-zinc-800 text-[var(--color-muted)] dark:text-zinc-400',
                  )}
                >
                  {isCompleted ? '✓' : s.id}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isCompleted && 'text-green-600 dark:text-green-400',
                    isActive && 'text-[var(--color-fg)] dark:text-zinc-100',
                    !isCompleted && !isActive && 'text-[var(--color-muted)] dark:text-zinc-400',
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
          Выбор шаблона
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
          Выберите базовый формат и геометрию этикетки для генерации
        </p>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templateIds.map((id) => {
          const tpl = templates[id];
          const isSelected = data.template_id === id;
          const isVertical = tpl.orientation === 'vertical';

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={cn(
                'relative flex flex-col rounded-xl border p-5 text-left transition-all cursor-pointer',
                isSelected
                  ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm">
                  <Check className="size-3.5" />
                </span>
              )}

              {/* Preview */}
              <div className="w-full h-40 border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg flex items-center justify-center p-4 mb-4">
                <TemplatePreview template={tpl} />
              </div>

              {/* Info */}
              <h3 className="text-base font-semibold text-[var(--color-fg)] dark:text-zinc-100">
                {tpl.name}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-muted)] dark:text-zinc-400 leading-relaxed">
                {tpl.description}
              </p>

              {/* Column list */}
              {Object.keys(tpl.columns_mapping).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(tpl.columns_mapping).slice(0, 4).map(([col, label]) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] dark:text-zinc-400"
                    >
                      <Columns className="size-2.5" />
                      {label}
                    </span>
                  ))}
                  {Object.keys(tpl.columns_mapping).length > 4 && (
                    <span className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] dark:text-zinc-400">
                      +{Object.keys(tpl.columns_mapping).length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Orientation & size tags */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] dark:text-zinc-400">
                  <Layout className="size-2.5" />
                  {isVertical ? 'Вертикальная' : 'Горизонтальная'}
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] dark:text-zinc-400">
                  <Grid className="size-2.5" />
                  {tpl.page_width_mm}×{tpl.page_height_mm} мм
                </span>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--color-muted)] dark:text-zinc-500">
                <span>Пропорции: {isVertical ? '2:3' : '4:1'}</span>
                {tpl.static.importer && <span className="truncate ml-2">{tpl.static.importer}</span>}
              </div>
            </button>
          );
        })}
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
          disabled={!hasSelection || processing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-all',
            hasSelection && !processing
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
