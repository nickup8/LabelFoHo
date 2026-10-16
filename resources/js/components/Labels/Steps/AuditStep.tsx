import { router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Phone, XCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useWizardNav } from '@/components/Labels/FohoShell';
import { templateCountFor } from '@/components/Labels/WizardStepper';
import type {WizardCategories} from '@/components/Labels/WizardStepper';
import { cn, formatSize } from '@/lib/utils';
import labels from '@/routes/labels';

const PAGE_SIZES = [10, 25, 50, 100] as const;

type FilterMode = 'all' | 'errors' | 'success';

interface RowData {
  product_name: string;
  supplier_article: string;
  barcode: string;
  size: string;
  composition: string;
  composition_raw?: string;
  manufacturer: string;
  factory_name: string;
  manufacture_date: string;
}

interface ValidationRow {
  row: number;
  data: RowData;
  errors: string[];
  is_valid: boolean;
}

interface Session {
  id: string;
  status: string;
  category: string | null;
  original_filename: string;
  validation_results: ValidationRow[];
}

interface ImporterCard {
  name: string;
  legal_address: string;
  phone: string;
  is_complete: boolean;
}

interface Props {
  session: Session;
  importer: ImporterCard | null;
  categories: WizardCategories;
}

export default function AuditStep({ session, importer, categories }: Props) {
  const rows: ValidationRow[] = session.validation_results ?? [];
  const total = rows.length;
  const validCount = rows.filter((r) => r.is_valid).length;
  const invalidCount = rows.filter((r) => !r.is_valid).length;

  const templateCount = templateCountFor(categories, session.category);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const importerReady = !!importer && importer.is_complete;

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'errors':
        return rows.filter((r) => !r.is_valid);
      case 'success':
        return rows.filter((r) => r.is_valid);
      default:
        return rows;
    }
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, filteredRows.length);

  const handleBack = () =>
    router.get(
      labels.index({ query: { session: session.id, step: 1 } }).url,
      {},
      { preserveState: true },
    );

  const handleNext = () => {
    if (invalidCount > 0) {
      return;
    }

    router.get(
      labels.index({
        query: { session: session.id, step: templateCount === 1 ? 4 : 3 },
      }).url,
      {},
      { preserveState: true },
    );
  };

  useWizardNav({
    back: handleBack,
    next: handleNext,
    nextDisabled: invalidCount > 0,
  });

  const switchFilter = (f: FilterMode) => {
    setFilter(f);
    setPage(1);
  };

  const hasBarcodeError = (entry: ValidationRow) =>
    entry.errors.some(
      (e) =>
        e.includes('Штрихкод') ||
        e.includes('Баркод') ||
        e.includes('EAN') ||
        e.includes('barcode'),
    );

  return (
    <div className="space-y-10">

      {/* Heading + Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            Результаты автоматической проверки файла{' '}
            <span className="font-medium text-[var(--color-fg)]">
              {session.original_filename}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-surface)] border border-zinc-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="size-2 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                Успешно
              </p>
              <p className="text-base font-bold text-[var(--color-fg)] mt-0.5">
                {validCount}
              </p>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] border border-zinc-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="size-2 rounded-full bg-red-500" />
            <div>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                Ошибки
              </p>
              <p className="text-base font-bold text-[var(--color-fg)] mt-0.5">
                {invalidCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shared importer card */}
      <div className="rounded-xl border border-zinc-200 bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg)]">
          Импортёр
        </h2>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Единая карточка реквизитов применяется ко всем строкам и сессиям.
          Без заполненной карточки экспорт PDF заблокирован.
        </p>

        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          {importer ? (
            <div className="space-y-1.5 text-sm text-[var(--color-fg)]">
              <p className="font-medium break-words">
                {importer.name}
              </p>
              <p className="break-words text-xs text-[var(--color-muted)]">
                {importer.legal_address}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Phone className="size-3.5 shrink-0" />
                {importer.phone}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Карточка импортёра не заполнена
            </p>
          )}
        </div>

        {!importerReady && (
          <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            Карточка импортёра не заполнена — экспорт PDF заблокирован.{' '}
            <a
              href="/importers"
              className="font-semibold underline underline-offset-2 hover:text-red-700"
            >
              Заполнить карточку
            </a>
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200/50 w-fit">
        {(['all', 'errors', 'success'] as const).map((f) => (
          <button
            key={f}
            onClick={() => switchFilter(f)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              filter === f
                ? 'bg-white text-[var(--color-fg)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            )}
          >
            {f === 'all' && `Все строки (${total})`}
            {f === 'errors' && `С ошибками (${invalidCount})`}
            {f === 'success' && `Без ошибок (${validCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-[var(--color-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Строка</th>
                <th className="py-3 px-4">Артикул / Название</th>
                <th className="py-3 px-4">Штрихкод</th>
                <th className="py-3 px-4">Фабрика</th>
                <th className="py-3 px-4">Размер / Состав</th>
                <th className="py-3 px-4 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedRows.map((entry) => {
                const d = entry.data;

                return (
                  <tr
                    key={entry.row}
                    className={cn(
                      'transition-colors',
                      entry.is_valid
                        ? 'hover:bg-zinc-50/50'
                        : 'bg-red-50/30 hover:bg-red-50/60',
                    )}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--color-muted)]">
                      {entry.row}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs text-[var(--color-fg)]">
                        {d.supplier_article || (
                          <span className="italic text-red-500">— пусто —</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-muted)] mt-0.5">
                        {d.product_name || (
                          <span className="italic text-red-500">— пусто —</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.barcode ? (
                        <span
                          className={cn(
                            'font-mono text-xs',
                            hasBarcodeError(entry)
                              ? 'text-red-700'
                              : 'text-[var(--color-fg)]',
                          )}
                        >
                          {d.barcode}
                        </span>
                      ) : (
                        <span className="italic text-red-500 text-xs">— пусто —</span>
                      )}
                      {hasBarcodeError(entry) &&
                        entry.errors
                          .filter(
                            (e) =>
                              e.includes('Штрихкод') ||
                              e.includes('Баркод') ||
                              e.includes('EAN') ||
                              e.includes('barcode'),
                          )
                          .map((err, i) => (
                            <div
                              key={i}
                              className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1"
                            >
                              <XCircle className="size-3 shrink-0" />
                              {err}
                            </div>
                          ))}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-[var(--color-fg)]">
                        {d.factory_name || (
                          <span className="italic text-red-500">— пусто —</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-[var(--color-fg)]">
                        {d.size ? formatSize(d.size) : (
                          <span className="italic text-red-500">— пусто —</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                        {session.category === 'mats'
                          ? d.composition_raw || d.composition || '—'
                          : d.composition || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {entry.is_valid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md">
                          <CheckCircle2 className="size-3" />
                          Готов
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-md">
                          <AlertTriangle className="size-3" />
                          {entry.errors.length}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-[var(--color-muted)]">
            Строки с {from} по {to} из {filteredRows.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs bg-transparent border border-zinc-200 rounded-lg px-2 py-1 text-[var(--color-muted)] outline-none"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-[var(--color-muted)] disabled:text-zinc-300 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                    p === page
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-[var(--color-fg)] hover:bg-zinc-100',
                  )}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-[var(--color-muted)] disabled:text-zinc-300 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error detail section */}
      {invalidCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-600">
            Детали ошибок
          </h3>
          <div className="space-y-1.5">
            {rows
              .filter((r) => !r.is_valid)
              .map((entry) => (
                <div
                  key={entry.row}
                  className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm"
                >
                  <p className="mb-1 text-xs font-medium text-red-700">
                    Строка #{entry.row}
                    {entry.data.product_name && ` · ${entry.data.product_name}`}
                  </p>
                  <ul className="space-y-0.5">
                    {entry.errors.map((err, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-red-600"
                      >
                        <span className="mt-0.5 block size-1 shrink-0 rounded-full bg-red-500" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
