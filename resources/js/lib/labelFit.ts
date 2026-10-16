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
 * Выбор режима левого столбца бирки по фактическому нижнему полю dataCol.
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
    left?: number;
    top?: number;
    height?: number;
}

interface LayoutRun {
    attributes?: {
        fontSize?: number;
        font?: Array<{ unitsPerEm?: number } | undefined>;
    };
    glyphs?: Array<{
        bbox?: { minY?: number };
        _metrics?: { bbox?: { minY?: number } };
    }>;
    positions?: Array<{ yOffset?: number }>;
}

interface LayoutLine {
    box?: { y?: number };
    ascent?: number;
    runs?: LayoutRun[];
}

interface LayoutNode {
    type?: string;
    props?: { id?: string };
    box?: LayoutBox;
    lines?: LayoutLine[];
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

function collectTexts(
    node: LayoutNode,
    parentX: number,
    parentY: number,
    out: Array<{ x: number; y: number; lines: LayoutLine[] }>,
): void {
    const x = parentX + (node.box?.left ?? 0);
    const y = parentY + (node.box?.top ?? 0);

    if (node.type === 'TEXT' && Array.isArray(node.lines)) {
        out.push({ x, y, lines: node.lines });
    }

    for (const child of node.children ?? []) {
        collectTexts(child, x, y, out);
    }
}

/** Чернильный низ столбца: самая нижняя точка глифа (bbox в единицах шрифта). */
function inkBottomOf(column: LayoutNode, rootTop: number): number | null {
    const texts: Array<{ x: number; y: number; lines: LayoutLine[] }> = [];
    collectTexts(column, 0, rootTop, texts);

    let ink = -Infinity;

    for (const text of texts) {
        for (const line of text.lines) {
            const baseline = text.y + (line.box?.y ?? 0) + (line.ascent ?? 0);

            for (const run of line.runs ?? []) {
                const font = run.attributes?.font?.[0];
                const upem = font?.unitsPerEm;
                const fontSize = run.attributes?.fontSize;

                if (!upem || !fontSize) {
                    continue;
                }

                const scale = fontSize / upem;
                const glyphs = run.glyphs ?? [];
                const positions = run.positions ?? [];

                for (let i = 0; i < glyphs.length; i += 1) {
                    const bbox = glyphs[i]?.bbox ?? glyphs[i]?._metrics?.bbox;

                    if (!bbox || typeof bbox.minY !== 'number') {
                        continue;
                    }

                    const yOffset = positions[i]?.yOffset ?? 0;
                    const value = baseline + yOffset - bbox.minY * scale;

                    if (Number.isFinite(value) && value > ink) {
                        ink = value;
                    }
                }
            }
        }
    }

    return Number.isFinite(ink) ? ink : null;
}

/** Нижнее поле (pt) чернил левого столбца на странице. */
function pageBottomInk(page: LayoutNode): number {
    const column = findNode(page, (node) => node.props?.id === DATA_COL_ID);
    const root = findNode(page, (node) => node.props?.id === 'pageRoot');

    if (!column?.box) {
        throw new Error('dataCol не найден в дереве вёрстки');
    }

    const rootTop = root?.box?.top ?? 0;
    const ink = inkBottomOf(column, rootTop);

    if (ink == null) {
        throw new Error('не удалось измерить текст левого столбца');
    }

    return +(GEOM.PAGE_H - ink).toFixed(2);
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

    return laid.children?.map(pageBottomInk) ?? [];
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
