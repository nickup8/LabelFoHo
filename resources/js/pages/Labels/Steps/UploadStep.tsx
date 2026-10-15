import { router, useForm } from '@inertiajs/react';
import { AlertCircle, ChevronRight, FileText, UploadCloud, X } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import WizardStepper, {
  templateCountFor,
  wizardSteps
  
} from '@/components/Labels/WizardStepper';
import type {WizardCategories} from '@/components/Labels/WizardStepper';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface SessionRef {
  id: string;
  category: string | null;
}

interface Props {
  categories: WizardCategories;
  category: string | null;
  onCategoryChange: (category: string) => void;
  session: SessionRef | null;
}

interface UploadForm {
  file: File | null;
  category: string | null;
}

export default function UploadStep({
  categories,
  category,
  onCategoryChange,
  session,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data, setData, post, processing, errors, setError } = useForm<UploadForm>({
    file: null,
    category,
  });

  const steps = wizardSteps(templateCountFor(categories, category));
  const categoryOptions = Object.entries(categories ?? {});

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      return 'Допустимы только файлы формата XLSX, XLS или CSV';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Размер файла не должен превышать 10 МБ';
    }

    return null;
  }, []);

  const handleCategorySelect = useCallback(
    (value: string) => {
      setError('category', '');
      setData('category', value);
      onCategoryChange(value);

      if (session && session.category && session.category !== value) {
        router.post(
          labels.category().url,
          { session_id: session.id, category: value },
          { preserveScroll: true },
        );
      }
    },
    [session, setData, setError, onCategoryChange],
  );

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) {
return;
}

      setError('file', '');

      const validationError = validateFile(file);

      if (validationError) {
        setError('file', validationError);

        return;
      }

      setData('file', file);
    },
    [setData, setError, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!data.category) {
        setError('category', 'Сначала выберите категорию');

        return;
      }

      handleFileSelect(e.dataTransfer.files[0]);
    },
    [data.category, handleFileSelect, setError],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files?.[0] ?? null);
    },
    [handleFileSelect],
  );

  const handleDropzoneClick = useCallback(() => {
    if (!data.category) {
      setError('category', 'Сначала выберите категорию');

      return;
    }

    inputRef.current?.click();
  }, [data.category, setError]);

  const handleSubmit = useCallback(() => {
    if (!data.category) {
      setError('category', 'Сначала выберите категорию');

      return;
    }

    if (!data.file || processing) {
return;
}

    post(labels.upload().url, {
      preserveScroll: true,
      onError: () => setData('file', null),
    });
  }, [data.category, data.file, processing, post, setData, setError]);

  const handleRemoveFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setData('file', null);
      setError('file', '');
    },
    [setData, setError],
  );

  const canProceed = !!data.file && !!data.category && !processing;
  const fileSizeDisplay = data.file ? formatSize(data.file.size) : null;

  return (
    <div className="space-y-10">

      <WizardStepper steps={steps} currentId={1} />

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
          Загрузка данных
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
          Выберите категорию и загрузите файл с данными товаров для генерации этикеток
        </p>
      </div>

      {/* Category selector */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-fg)] dark:text-zinc-100">
          Категория товара{' '}
          <span className="text-red-500">*</span>
        </h2>
        <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {categoryOptions.map(([value, definition]) => {
            if (!definition) {
              return null;
            }

            const isSelected = data.category === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleCategorySelect(value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/10 bg-[var(--color-accent)]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-[var(--color-accent)]'
                      : 'border-zinc-300 dark:border-zinc-600',
                  )}
                >
                  {isSelected && (
                    <span className="size-2.5 rounded-full bg-[var(--color-accent)]" />
                  )}
                </span>
                <span className="text-sm font-medium text-[var(--color-fg)] dark:text-zinc-100">
                  {definition.label}
                </span>
              </button>
            );
          })}
        </div>

        {errors.category && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-500 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            {errors.category}
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleDropzoneClick}
        className={cn(
          'rounded-xl border-2 p-12 text-center transition-all',
          !data.category
            ? 'border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 opacity-60'
            : isDragging
              ? 'cursor-pointer border-solid border-[var(--color-accent)] bg-blue-500/5 dark:bg-blue-500/10'
              : 'cursor-pointer border-dashed border-zinc-300 dark:border-zinc-700 bg-[var(--color-surface)] dark:bg-zinc-900 hover:border-[var(--color-accent)]/60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={handleInputChange}
          disabled={processing || !data.category}
        />

        {processing ? (
          <div className="flex flex-col items-center gap-4">
            <span className="inline-block size-10 animate-spin rounded-full border-[3px] border-zinc-200 dark:border-zinc-700 border-t-[var(--color-accent)]" />
            <p className="text-sm font-medium text-[var(--color-muted)] dark:text-zinc-400">
              Загрузка и обработка файла...
            </p>
          </div>
        ) : data.file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
              <FileText className="size-7 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--color-fg)] dark:text-zinc-100">
                {data.file.name}
              </p>
              {fileSizeDisplay && (
                <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">{fileSizeDisplay}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <X className="size-3.5" />
              Удалить файл
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
              <UploadCloud className="size-7 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--color-fg)] dark:text-zinc-100">
                {data.category
                  ? 'Перетащите файл сюда или '
                  : 'Сначала выберите категорию товара'}
                {data.category && (
                  <span className="text-[var(--color-accent)] hover:underline cursor-pointer">
                    выберите на компьютере
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
                Поддерживаются форматы CSV, XLSX, XLS
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ALLOWED_EXTENSIONS.map((ext) => (
                <span
                  key={ext}
                  className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 font-mono text-xs text-[var(--color-muted)]"
                >
                  .{ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {errors.file && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-red-500 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {errors.file}
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface)] dark:bg-zinc-900 px-6 py-4">
        <p className="text-sm text-[var(--color-muted)] dark:text-zinc-400">
          {data.file ? data.file.name : 'Файл не выбран'}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canProceed}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition-all',
            canProceed
              ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
              : 'bg-zinc-200 dark:bg-zinc-800 text-[var(--color-muted)] dark:text-zinc-400 cursor-not-allowed opacity-50',
          )}
        >
          {processing ? (
            <>
              <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Загрузка...
            </>
          ) : (
            <>
              Далее
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
return `${bytes} Б`;
}

  if (bytes < 1024 * 1024) {
return `${(bytes / 1024).toFixed(1)} КБ`;
}

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
