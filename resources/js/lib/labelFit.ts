import layout from '@react-pdf/layout';
import { Font, pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import TagLabelDocument, {
    DATA_COL_ID,
    GEOM,
    NORMAL_BOTTOM_MIN,
} from '@/components/Labels/TagLabelDocument';
import type { LabelMode } from '@/components/Labels/TagLabelDocument';
import type { LabelData } from '@/types/labels';

/**
 * Выбор режима левого столбца бирки по фактическому нижнему полю dataCol:
 * bottomBox = PAGE_H − (absoluteTop(dataCol) + dataCol.box.height).
 * Замер делается одним проходом layout на весь документ:
 * pdf().container.document + общий Font рендерера.
 *
 * Правила:
 *  1) normal, если нижнее поле >= 24 pt с допуском 0.75 pt (23.25 pt);
 *  2) иначе compact, но только при нижнем поле >= 23.25 pt;
 *  3) иначе артикул считается проблемным — экспорт останавливается.
 */
const BOTTOM_TOLERANCE = 0.75;
export const BOTTOM_MIN = NORMAL_BOTTOM_MIN - BOTTOM_TOLERANCE;

interface LayoutBox {
    top?: number;
    height?: number;
}

interface LayoutNode {
    props?: { id?: string };
    box?: LayoutBox;
    children?: LayoutNode[];
}

// Второй аргумент layout() — fontStore рендерера; в типах он не описан.
type LayoutDocument = (
    doc: unknown,
    fontStore: typeof Font,
) => Promise<unknown>;
const layoutDocument = layout as unknown as LayoutDocument;

function findNode(
    node: LayoutNode | undefined,
    predicate: (node: LayoutNode) => boolean,
): LayoutNode | null {
    if (!node) {
        return null;
    }

    if (predicate(node)) {
        return node;
    }

    for (const child of node.children ?? []) {
        const found = findNode(child, predicate);

        if (found) {
            return found;
        }
    }

    return null;
}

/** Нижнее поле (pt) по нижней границе dataCol.box на странице. */
function pageBottomBox(page: LayoutNode): number {
    const column = findNode(page, (node) => node.props?.id === DATA_COL_ID);
    const root = findNode(page, (node) => node.props?.id === 'pageRoot');

    if (!column?.box) {
        throw new Error('dataCol не найден в дереве вёрстки');
    }

    const rootTop = root?.box?.top ?? 0;
    const absoluteTop = rootTop + (column.box.top ?? 0);

    return +(GEOM.PAGE_H - (absoluteTop + (column.box.height ?? 0))).toFixed(
        2,
    );
}

/** Нижнее поле каждой метки при заданном режиме. */
async function measureBottoms(
    labels: LabelData[],
    modes: LabelMode[],
): Promise<number[]> {
    // pdf() типизирован под <Document/>, а здесь обёртка компонента.
    const element = createElement(TagLabelDocument, {
        labels,
        modes,
    }) as ReactElement<DocumentProps>;
    const instance = pdf(element);
    const document = instance.container.document;
    const laid = (await layoutDocument(document, Font)) as LayoutNode;

    return laid.children?.map(pageBottomBox) ?? [];
}

export interface LabelFitResult {
    /** Режим каждой метки; для проблемных артикулов стоит 'normal' — не использовать, экспорт останавливается по errorSkus. */
    modes: LabelMode[];
    /** Артикулы, которые не помещаются ни в normal, ни в compact. */
    errorSkus: string[];
}

/** Выбирает режим каждой метки; при проблемах бросает ошибку с текстом для UI. */
export async function decideModes(
    labels: LabelData[],
): Promise<LabelFitResult> {
    let normalBottoms: number[];

    try {
        normalBottoms = await measureBottoms(
            labels,
            labels.map(() => 'normal'),
        );
    } catch (error) {
        throw new Error(
            `Не удалось измерить макет бирки: ${
                error instanceof Error ? error.message : 'неизвестная ошибка'
            }`,
        );
    }

    const modes: Array<LabelMode | null> = normalBottoms.map((bottom) =>
        bottom >= BOTTOM_MIN ? 'normal' : null,
    );

    const restIndexes = modes.reduce<number[]>((acc, mode, index) => {
        if (!mode) {
            acc.push(index);
        }

        return acc;
    }, []);

    if (restIndexes.length > 0) {
        try {
            const compactBottoms = await measureBottoms(
                restIndexes.map((index) => labels[index]),
                restIndexes.map(() => 'compact'),
            );

            restIndexes.forEach((index, order) => {
                modes[index] =
                    compactBottoms[order] >= BOTTOM_MIN ? 'compact' : null;
            });
        } catch (error) {
            throw new Error(
                `Не удалось измерить компактный макет бирки: ${
                    error instanceof Error
                        ? error.message
                        : 'неизвестная ошибка'
                }`,
            );
        }
    }

    const errorSkus = restIndexes
        .filter((index) => modes[index] === null)
        .map((index) => labels[index].sku);

    return {
        modes: modes.map((mode) => mode ?? 'normal'),
        errorSkus,
    };
}
