import { useRef, useState, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { AlertCircle, ChevronRight, FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';

const STEPS = [
  { id: 1, label: 'Загрузка' },
  { id: 2, label: 'Аудит' },
  { id: 3, label: 'Шаблон' },
  { id: 4, label: 'Просмотр' },
  { id: 5, label: 'Экспорт' },
] as const;

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadForm {
  file: File | null;
}

export default function UploadStep() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data, setData, post, processing, errors, setError } = useForm<UploadForm>({
    file: null,
  });

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

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) return;
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
      handleFileSelect(e.dataTransfer.files[0]);
    },
    [handleFileSelect],
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

  const handleSubmit = useCallback(() => {
    if (!data.file || processing) return;
    post(labels.upload().url, {
      preserveScroll: true,
      onError: () => setData('file', null),
    });
  }, [data.file, processing, post, setData]);

  const handleRemoveFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setData('file', null);
      setError('file', '');
    },
    [setData, setError],
  );

  const canProceed = !!data.file && !processing;
  const fileSizeDisplay = data.file ? formatSize(data.file.size) : null;

  return (
    <div className="space-y-10">

      {/* Stepper */}
      <nav aria-label="Прогресс" className="relative">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center justify-between">
          {STEPS.map((s) => {
            const isActive = s.id === 1;

            return (
              <div
                key={s.id}
                className="relative flex flex-col items-center bg-[var(--color-bg)] dark:bg-zinc-900 px-4"
              >
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--color-muted)] dark:text-zinc-400',
                  )}
                >
                  {s.id}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isActive
                      ? 'text-[var(--color-fg)] dark:text-zinc-100'
                      : 'text-[var(--color-muted)] dark:text-zinc-400',
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
          Загрузка данных
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
          Загрузите файл с данными товаров для генерации этикеток
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-xl border-2 p-12 text-center transition-all',
          isDragging
            ? 'border-solid border-[var(--color-accent)] bg-blue-500/5 dark:bg-blue-500/10'
            : 'border-dashed border-zinc-300 dark:border-zinc-700 bg-[var(--color-surface)] dark:bg-zinc-900 hover:border-[var(--color-accent)]/60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={handleInputChange}
          disabled={processing}
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
                Перетащите файл сюда или{' '}
                <span className="text-[var(--color-accent)] hover:underline cursor-pointer">
                  выберите на компьютере
                </span>
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
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
