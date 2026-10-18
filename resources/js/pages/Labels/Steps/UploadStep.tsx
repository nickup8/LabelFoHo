import { router, useForm } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import CategoryGuide from '@/components/Labels/CategoryGuide';
import { useWizardNav } from '@/components/Labels/FohoShell';
import VolumeScene from '@/components/Labels/VolumeScene';
import type { WizardCategories } from '@/components/Labels/WizardStepper';
import { cn } from '@/lib/utils';
import labels from '@/routes/labels';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

const uploadIcon = (
    <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M16 21V7m-5 5 5-5 5 5M7 21v5h18v-5" />
    </svg>
);

const docIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" />
    </svg>
);

interface SessionRef {
    id: string;
    category: string | null;
    original_filename?: string;
    validation_results?: Array<{ row: number }>;
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

function fileSizeLabel(bytes: number): string {
    return `${(bytes / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} КБ`;
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

export default function UploadStep({
    categories,
    category,
    onCategoryChange,
    session,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const categoriesRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dismissedSessionFile, setDismissedSessionFile] = useState(false);

    const { data, setData, post, processing, errors, setError } =
        useForm<UploadForm>({
            file: null,
            category,
        });

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
            setDismissedSessionFile(false);
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

    const focusCategory = useCallback((value: string) => {
        const options =
            categoriesRef.current?.querySelectorAll<HTMLElement>(
                '[data-category]',
            ) ?? [];

        options.forEach((option) => {
            if (option.getAttribute('data-category') === value) {
                option.focus();
            }
        });
    }, []);

    const handleCategoryKeyDown = useCallback(
        (event: React.KeyboardEvent, index: number) => {
            if (!ARROW_KEYS.includes(event.key)) {
                return;
            }

            event.preventDefault();

            const entry = categoryOptions[1 - index];

            if (!entry || !entry[1]) {
                return;
            }

            handleCategorySelect(entry[0]);
            focusCategory(entry[0]);
        },
        [categoryOptions, handleCategorySelect, focusCategory],
    );

    const handleFileSelect = useCallback(
        (file: File | null) => {
            if (!file || processing) {
                return;
            }

            setError('file', '');

            const validationError = validateFile(file);

            if (validationError) {
                setError('file', validationError);

                return;
            }

            setDismissedSessionFile(false);
            setData('file', file);
            post(labels.upload().url, {
                preserveScroll: true,
                preserveState: true,
                showProgress: false,
                onError: () => setData('file', null),
                onSuccess: () => {
                    // Stay on the upload step: the file card and the real
                    // row count come from the refreshed session props.
                    setData('file', null);
                },
            });
        },
        [
            processing,
            post,
            setData,
            setError,
            setDismissedSessionFile,
            validateFile,
        ],
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

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();

            if (data.category && !processing) {
                setIsDragging(true);
            }
        },
        [data.category, processing],
    );

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

    const handleChooseClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            handleDropzoneClick();
        },
        [handleDropzoneClick],
    );

    // The package keeps the chosen file on the way back from the audit; the
    // real app restores the same card from the server session instead of a
    // client-side File object (size is not stored, so only name and the real
    // parsed row count are shown). changeCategory nulls validation_results, so
    // a parsed-session check also blocks continuing on a stale category.
    const sessionFile =
        !data.file &&
        !dismissedSessionFile &&
        session &&
        session.category === data.category &&
        session.original_filename &&
        (session.validation_results?.length ?? 0) > 0
            ? session
            : null;
    const sessionRowCount = sessionFile?.validation_results?.length ?? 0;

    const handleSubmit = useCallback(() => {
        if (!data.category) {
            setError('category', 'Сначала выберите категорию');

            return;
        }

        if (processing) {
            return;
        }

        // The upload already ran on file select; «Далее» only opens the
        // audit of the saved session.
        if (sessionFile) {
            router.get(
                labels.index({
                    query: { session: sessionFile.id, step: 2 },
                }).url,
                {},
                { preserveState: true },
            );
        }
    }, [data.category, processing, sessionFile, setError]);

    const handleRemoveFile = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();

            if (data.file) {
                setData('file', null);
                setError('file', '');
            } else {
                setDismissedSessionFile(true);
            }
        },
        [data.file, setData, setError],
    );

    const canProceed = !!sessionFile && !!data.category && !processing;

    useWizardNav({ next: handleSubmit, nextDisabled: !canProceed });

    const categoryDefinition = data.category
        ? categories?.[data.category]
        : undefined;
    const errorMessage = errors.category || errors.file;
    const dropState = !data.category
        ? 'disabled'
        : !data.file && !sessionFile && !processing
          ? 'awaiting-file'
          : '';

    return (
        <div>
            <div className="category-row">
                <span id="category-label">Категория товара</span>
                <div
                    ref={categoriesRef}
                    className="categories"
                    role="radiogroup"
                    aria-labelledby="category-label"
                >
                    {categoryOptions.map(([value, definition], index) => {
                        if (!definition) {
                            return null;
                        }

                        const isSelected = data.category === value;

                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                data-category={value}
                                tabIndex={
                                    isSelected || (!data.category && index === 0)
                                        ? 0
                                        : -1
                                }
                                className={cn(
                                    'category',
                                    isSelected && 'selected',
                                )}
                                onClick={() => handleCategorySelect(value)}
                                onKeyDown={(event) =>
                                    handleCategoryKeyDown(event, index)
                                }
                            >
                                {definition.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                className={cn('drop', dropState, isDragging && 'over')}
                aria-label="Загрузка файла"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleDropzoneClick}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    hidden
                    onChange={handleInputChange}
                    disabled={processing || !data.category}
                />

                {processing ? (
                    <>
                        <VolumeScene mode="uploading" />
                        <h2>Читаем файл</h2>
                        <p>Подготавливаем данные товаров</p>
                    </>
                ) : data.file ? (
                    <div className="file-card">
                        <div className="file-icon">{docIcon}</div>
                        <div className="file-info">
                            <div className="file-name">{data.file.name}</div>
                            <div className="file-meta">
                                {fileSizeLabel(data.file.size)}
                                {categoryDefinition
                                    ? ` · ${categoryDefinition.label}`
                                    : ''}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="remove"
                            onClick={handleRemoveFile}
                        >
                            Удалить
                        </button>
                    </div>
                ) : sessionFile ? (
                    <>
                        <div className="file-card">
                            <div className="file-icon">{docIcon}</div>
                            <div className="file-info">
                                <div className="file-name">
                                    {sessionFile.original_filename}
                                </div>
                                <div className="file-meta">
                                    {categoryDefinition?.label ??
                                        sessionFile.category}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="remove"
                                onClick={handleRemoveFile}
                            >
                                Удалить
                            </button>
                        </div>
                        <div className="success-note">
                            <span className="small-check" aria-hidden="true">
                                ✓
                            </span>{' '}
                            {sessionRowCount}{' '}
                            {pluralize(sessionRowCount, [
                                'строка',
                                'строки',
                                'строк',
                            ])}{' '}
                            {pluralize(sessionRowCount, [
                                'добавлена',
                                'добавлены',
                                'добавлено',
                            ])}
                        </div>
                    </>
                ) : !data.category ? (
                    <h2 id="category-prompt">Сначала выберите категорию</h2>
                ) : (
                    <>
                        <svg
                            className="upload-border"
                            aria-hidden="true"
                        >
                            <rect x="1" y="1" rx="20" pathLength={100} />
                        </svg>
                        <div className="upload-symbol">{uploadIcon}</div>
                        <h2>Перетащите файл сюда</h2>
                        <p>или выберите его на компьютере</p>
                        <button
                            type="button"
                            className="choose"
                            onClick={handleChooseClick}
                        >
                            Выбрать файл
                        </button>
                        <div className="formats">XLSX · XLS · CSV</div>
                    </>
                )}
            </div>

            <p className="error" role="alert">
                {errorMessage}
            </p>

            {!data.category && <CategoryGuide />}
        </div>
    );
}
