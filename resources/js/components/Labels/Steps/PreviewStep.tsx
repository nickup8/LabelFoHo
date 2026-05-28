import { router } from '@inertiajs/react';
import { ArrowLeft, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';

const STEPS = [
  { id: 1, label: 'Загрузка' },
  { id: 2, label: 'Аудит' },
  { id: 3, label: 'Шаблон' },
  { id: 4, label: 'Просмотр' },
  { id: 5, label: 'Экспорт' },
] as const;

interface PreviewData {
  row: number;
  data: Record<string, string>;
  barcode_data_uri: string | null;
  brand: { name: string; trademark: string; importer: string };
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
  original_filename: string;
}

interface Template {
  name: string;
  description: string;
  orientation: string;
  page_width_mm: number;
  page_height_mm: number;
  columns_mapping: Record<string, string>;
  sections: Record<string, { y_mm: number; height_mm: number }>;
  fields: Record<string, Record<string, unknown>>;
  static: Record<string, unknown>;
}

interface Props {
  session: Session;
  templates: Record<string, Template>;
  previewData: PreviewData;
}

function LabelMockup({ data }: { data: PreviewData }) {
  const d = data.data;

  return (
    <div className="bg-white border border-zinc-300 rounded p-4 text-black font-sans aspect-[3/2] flex flex-col justify-between shadow-sm w-full">
      <div className="flex justify-between items-start">
        <div className="text-[10px] font-bold tracking-tight uppercase">
          {data.static.trademark}
        </div>
        {d.size && (
          <div className="text-[10px] font-mono font-semibold text-gray-700">{d.size}</div>
        )}
      </div>

      <div className="my-2">
        <div className="text-xs font-bold leading-tight truncate">
          {d.product_name || '—'}
        </div>
        <div className="text-[8px] text-gray-600 mt-0.5">
          {d.composition && `Состав: ${d.composition}`}
          {d.composition && d.supplier_article ? ' · ' : ''}
          {d.supplier_article && `Арт: ${d.supplier_article}`}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-xs text-gray-600">
          {d.manufacturer && (
            <div className="text-[7px]">{d.manufacturer}</div>
          )}
        </div>
        <div className="flex flex-col items-center">
          {data.barcode_data_uri ? (
            <img
              src={data.barcode_data_uri}
              alt="EAN-13"
              className="h-6 object-contain"
            />
          ) : (
            <div className="font-mono text-[8px] tracking-tighter leading-none font-bold text-gray-800">
              ||||||||||||||||||
            </div>
          )}
          {d.barcode && (
            <div className="text-[6px] font-mono mt-0.5 text-gray-700">{d.barcode}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PreviewStep({ session, templates: _templates, previewData }: Props) {
  const handleBack = () =>
    router.get(labels.index({ query: { session: session.id, step: 3 } }).url);

  const handleExport = () =>
    router.get(labels.index({ query: { session: session.id, step: 5 } }).url);

  return (
    <div className="space-y-10 max-w-5xl">

      {/* Stepper */}
      <nav aria-label="Прогресс" className="relative">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center justify-between">
          {STEPS.map((s) => {
            const isCompleted = s.id === 1 || s.id === 2 || s.id === 3;
            const isActive = s.id === 4;

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
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
          <Eye className="size-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
            Предпросмотр этикеток
          </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
          Проверьте внешний вид сгенерированных этикеток перед сохранением в PDF
        </p>
        </div>
      </div>

      {/* Labels grid — full width */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900/50 rounded-xl p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <LabelMockup data={previewData} />
          <LabelMockup data={previewData} />
          <LabelMockup data={previewData} />
        </div>

        <div className="text-center text-xs text-[var(--color-muted)] dark:text-zinc-500 mt-6">
          Показано превью этикеток для предварительного контроля
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
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-95"
        >
          <FileText className="size-4" />
          Создать PDF
        </button>
      </div>
    </div>
  );
}
