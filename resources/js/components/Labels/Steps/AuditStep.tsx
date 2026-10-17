import { Link, router } from '@inertiajs/react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useWizardNav, useWizardOverlay } from '@/components/Labels/FohoShell';
import { templateCountFor } from '@/components/Labels/WizardStepper';
import type { WizardCategories } from '@/components/Labels/WizardStepper';
import { formatSize } from '@/lib/utils';
import labels from '@/routes/labels';

const PAGE_SIZES = [10, 25, 50] as const;

type FilterMode = 'all' | 'errors' | 'valid';

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

function rowComposition(entry: ValidationRow, category: string | null): string {
    // Mats print the factory's raw composition string; napkins keep the
    // normalized one (existing validation/PDF data rule).
    return category === 'mats'
        ? entry.data.composition_raw || entry.data.composition || ''
        : entry.data.composition || '';
}

/**
 * Package `modal()` veil: backdrop click and Escape close the dialog, Tab is
 * trapped, focus lands on the veil (mounted through the shell overlay slot).
 */
function DetailVeil({
    onClose,
    children,
}: {
    onClose: () => void;
    children: ReactNode;
}) {
    const veilRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        veilRef.current?.focus();
    }, []);

    return (
        <div
            ref={veilRef}
            className="dialog-veil"
            role="presentation"
            tabIndex={-1}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    onClose();

                    return;
                }

                if (event.key !== 'Tab') {
                    return;
                }

                const items = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                        'button,input,a,[tabindex]:not([tabindex="-1"])',
                    ),
                );

                if (items.length === 0) {
                    return;
                }

                const first = items[0];
                const last = items[items.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }}
        >
            {children}
        </div>
    );
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
    const [detailRow, setDetailRow] = useState<ValidationRow | null>(null);

    const detailReturnFocusRef = useRef<HTMLElement | null>(null);

    const filteredRows = useMemo(() => {
        switch (filter) {
            case 'errors':
                return rows.filter((r) => !r.is_valid);
            case 'valid':
                return rows.filter((r) => r.is_valid);
            default:
                return rows;
        }
    }, [rows, filter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    const paginatedRows = filteredRows.slice(offset, offset + pageSize);

    const categoryLabel = session.category
        ? (categories?.[session.category]?.label ?? session.category)
        : '';

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
                query: {
                    session: session.id,
                    step: templateCount === 1 ? 4 : 3,
                },
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

    const openDetail = (entry: ValidationRow) => {
        detailReturnFocusRef.current =
            document.activeElement as HTMLElement | null;
        setDetailRow(entry);
    };

    const closeDetail = () => {
        setDetailRow(null);
        detailReturnFocusRef.current?.focus();
    };

    // The dialog must live outside `.stage` (its transform traps fixed
    // positioning), so it is published to the shell root through the overlay
    // slot — the package appends the same markup to `document.body`.
    useWizardOverlay(
        detailRow ? (
            <DetailVeil onClose={closeDetail}>
                <section
                    className="dialog detail-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dialog-title"
                >
                    <div className="detail-heading">
                        <span className="overline">Строка {detailRow.row}</span>
                        <button
                            type="button"
                            className="close-icon"
                            aria-label="Закрыть"
                            onClick={closeDetail}
                        >
                            ×
                        </button>
                    </div>
                    <h2 id="dialog-title">
                        {detailRow.data.supplier_article || 'Данные товара'}
                    </h2>
                    <p>{detailRow.data.product_name}</p>
                    {detailRow.errors.length > 0 && (
                        <ul className="row-errors">
                            {detailRow.errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    )}
                    <dl className="detail-list">
                        <div>
                            <dt>Штрихкод</dt>
                            <dd>{detailRow.data.barcode || 'Не заполнено'}</dd>
                        </div>
                        <div>
                            <dt>Фабрика</dt>
                            <dd>
                                {detailRow.data.factory_name || 'Не заполнено'}
                            </dd>
                        </div>
                        <div>
                            <dt>Размер</dt>
                            <dd>
                                {detailRow.data.size
                                    ? formatSize(detailRow.data.size)
                                    : 'Не заполнено'}
                            </dd>
                        </div>
                        <div>
                            <dt>Состав</dt>
                            <dd>
                                {rowComposition(detailRow, session.category) ||
                                    'Не заполнено'}
                            </dd>
                        </div>
                    </dl>
                    <div className="dialog-actions">
                        <button
                            type="button"
                            className="primary"
                            onClick={closeDetail}
                        >
                            Закрыть
                        </button>
                    </div>
                </section>
            </DetailVeil>
        ) : null,
    );

    const switchFilter = (f: FilterMode) => {
        setFilter(f);
        setPage(1);
    };

    return (
        <div>
            <div className="audit-top">
                <div className="audit-source">
                    Файл <strong>{session.original_filename}</strong>
                    <span>
                        {categoryLabel} · {total}{' '}
                        {pluralize(total, ['строка', 'строки', 'строк'])}
                    </span>
                </div>
                <div className="audit-counters">
                    <div>
                        <b>{validCount}</b>
                        <span>Готовы к экспорту</span>
                    </div>
                    <div
                        className={invalidCount > 0 ? 'has-errors' : undefined}
                    >
                        <b>{invalidCount}</b>
                        <span>Требуют внимания</span>
                    </div>
                </div>
            </div>

            <section className="importer-strip">
                <div className="importer-symbol" aria-hidden="true">
                    ↳
                </div>
                <div className="importer-summary">
                    <span className="overline">Импортёр</span>
                    <strong>
                        {importer?.name || 'Реквизиты не заполнены'}
                    </strong>
                    <p>
                        {importer?.legal_address ||
                            'Добавьте адрес и телефон для экспорта PDF.'}
                    </p>
                    <span>{importer?.phone ?? ''}</span>
                </div>
                <Link href="/importers" className="text-link" prefetch>
                    Изменить ↗
                </Link>
            </section>

            <div className="table-tools">
                <div
                    className="filter-tabs"
                    role="group"
                    aria-label="Строки таблицы"
                >
                    {(
                        [
                            ['all', 'Все строки', total],
                            ['errors', 'С ошибками', invalidCount],
                            ['valid', 'Без ошибок', validCount],
                        ] as const
                    ).map(([key, label, count]) => (
                        <button
                            key={key}
                            type="button"
                            className={filter === key ? 'selected' : undefined}
                            aria-pressed={filter === key}
                            onClick={() => switchFilter(key)}
                        >
                            {label}
                            <span>{count}</span>
                        </button>
                    ))}
                </div>
                {invalidCount > 0 && (
                    <span className="table-hint">
                        Исправьте ошибки в исходном файле и загрузите его
                        заново.
                    </span>
                )}
            </div>

            <div className="table-shell">
                <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Данные товаров"
                >
                    <table>
                        <thead>
                            <tr>
                                <th className="row-num">Строка</th>
                                <th>Артикул / название</th>
                                <th>Штрихкод</th>
                                <th>Фабрика</th>
                                <th>Размер / состав</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.length > 0 ? (
                                paginatedRows.map((entry) => (
                                    <tr key={entry.row}>
                                        <td className="row-num">{entry.row}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="sku-link"
                                                onClick={() =>
                                                    openDetail(entry)
                                                }
                                            >
                                                {entry.data.supplier_article ||
                                                    'Без артикула'}{' '}
                                                ↗
                                            </button>
                                            <span className="cell-secondary">
                                                {entry.data.product_name ||
                                                    'Название не заполнено'}
                                            </span>
                                        </td>
                                        <td className="barcode-cell">
                                            {entry.data.barcode || '—'}
                                        </td>
                                        <td>
                                            {entry.data.factory_name || '—'}
                                        </td>
                                        <td>
                                            <span className="cell-size">
                                                {entry.data.size
                                                    ? formatSize(
                                                          entry.data.size,
                                                      )
                                                    : 'Размер не заполнен'}
                                            </span>
                                            <span className="cell-secondary composition">
                                                {rowComposition(
                                                    entry,
                                                    session.category,
                                                ) || 'Состав не заполнен'}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`status-chip ${
                                                    entry.is_valid
                                                        ? 'valid'
                                                        : 'invalid'
                                                }`}
                                            >
                                                {entry.is_valid
                                                    ? '✓ Готов'
                                                    : `! ${entry.errors.length} ${pluralize(
                                                          entry.errors.length,
                                                          [
                                                              'ошибка',
                                                              'ошибки',
                                                              'ошибок',
                                                          ],
                                                      )}`}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-table">
                                            <span>✓</span>
                                            <strong>Здесь всё в порядке</strong>
                                            <p>Строк с ошибками нет.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="table-bottom">
                    <span>
                        {filteredRows.length
                            ? `Строки ${offset + 1}–${Math.min(offset + pageSize, filteredRows.length)} из ${filteredRows.length}`
                            : 'Нет строк'}
                    </span>
                    <div className="table-pagination">
                        <label>
                            Показывать{' '}
                            <select
                                aria-label="Строк на странице"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                {PAGE_SIZES.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="button"
                            aria-label="Предыдущая страница"
                            disabled={currentPage === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ←
                        </button>
                        <span className="page-current">{currentPage}</span>
                        <button
                            type="button"
                            aria-label="Следующая страница"
                            disabled={currentPage === totalPages}
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
