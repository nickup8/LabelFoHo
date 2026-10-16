import { Buffer } from 'buffer';
import {
    Document,
    Page,
    View,
    Text,
    Image,
    Svg,
    Path,
    StyleSheet,
} from '@react-pdf/renderer';
import { memo } from 'react';
import {
    formatAddress,
    formatDate,
} from '@/components/Labels/VerticalLabelLayout';
import { formatSize } from '@/lib/utils';
import type { LabelData } from '@/types/labels';

// Геометрия горизонтальной бирки 712x419 pt, откалибрована по эталону
// docs/Screenshot_4.png.
const PAGE_W = 712;
const PAGE_H = 419;

/**
 * Два фиксированных режима левого столбца.
 * Правый блок (EAC/штрихкод/номер/техрегламент) и шрифты в обоих режимах
 * одни и те же:
 *  - normal : все интервалы столбца 10 pt, включая шапку
 *  - compact: все интервалы столбца 6 pt, включая шапку
 */
export type LabelMode = 'normal' | 'compact';

export const MODES: Record<LabelMode, { gap: number; headerGap: number }> = {
    normal: { gap: 10, headerGap: 10 },
    compact: { gap: 6, headerGap: 6 },
};

/** Нижнее поле, которое обязано остаться в обычном режиме (pt). */
export const NORMAL_BOTTOM_MIN = 24;

// ---- текстовый столбец (эталон: чернила от x=44.27, базовая линия заголовка 43.93) ----
const DATA_X = 44.0; // левое поле бокса
const DATA_TOP = 20.7; // верх бокса заголовка
const DATA_W = 372; // ширина текстового столбца
const BLOCK_GAP = 10; // зазор между информационными блоками

/** Геометрия для внешнего замера нижнего поля (используется выборщиком режима). */
export const GEOM = { PAGE_W, PAGE_H, DATA_X, DATA_TOP, DATA_W };

/** Маркер узла левого столбца — чтобы найти бокс в дереве layout. */
export const DATA_COL_ID = 'dataCol';

// ---- кегли/интерлиньяж по измерению (24/32/16/14) ----
// базовая линия = верх бокса строки + 0.969 * кегль (лид сверху не учитывается)
const LH_TITLE = '31pt'; // 24 pt — заголовок
const LH_ARTICLE = '35pt'; // 32 pt — артикул
const LH_BODY = '19pt'; // 16 pt: внутри блока 19.0, между блоками 29.0
const LH_REG = '16.9pt'; // 14 pt техрегламент

// ---- цвета по измерению ----
const COLOR_BODY = '#000000'; // текст, номер, техрегламент
const COLOR_HEAD = '#333333'; // заголовок и артикул
const COLOR_GRAPH = '#333333'; // EAC и штрихкод

// ---- EAC: чернила 451.66..486.17 x 36.04..70.58 ----
const EAC_X = 451.3;
const EAC_Y = 35.7;
const EAC_S = 35.3;

// ---- штрихкод: чернила 504.93..579.95 x 36.79..380.70 (чтение снизу вверх) ----
const BAR_W = 344.66; // длина штрихкода (после поворота - по Y)
const BAR_H = 75.78; // высота штрихов (после поворота - по X)
const BAR_CX = 542.44;
const BAR_CY = 208.75;

// ---- номер: чернила 594.21..605.46 x 146.42..271.82, центр по высоте страницы ----
const NUM_CX = 600.4;
const NUM_CY = 208.6;
const NUM_BOX_W = 220;
const NUM_TRACKING = 1.05; // в эталоне разрядка цифр больше, чем у Inter по умолчанию

// ---- техрегламент: 3 строки, левая строка от x=633.22, начало текста у y=361.18 ----
const REG_X0 = 631.25; // левый край повёрнутого бокса
const REG_Y_BOTTOM = 362.0; // нижний край повёрнутого бокса (старт текста)
const REG_W = 330; // длина строки бокса (перенос после «легкой»)
const REG_H = 50.7; // расчётная высота 3 строк (для центра поворота), сам бокс — авто

// Штрихкод генератора приложения: SVG 380x78 в чёрном. Нужен #333333 и
// точный бокс бирки: convertToSvgNode в react-pdf жёстко масштабирует
// картинку "meet" (с сохранением пропорций), поэтому геометрию пересчитываем
// в координаты бокса (344.66 x 75.78) — растяжение как у object-fit: fill.
function prepareBarcodeUri(uri: string | null | undefined): string | null {
    if (!uri) {
        return null;
    }

    const i = uri.indexOf(',');

    if (i < 0) {
        return uri;
    }

    const head = uri.slice(0, i);
    const payload = uri.slice(i + 1);
    const b64 = /;base64/i.test(head);
    const svg = b64
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);

    const out0 = svg
        .replace(/rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/g, 'rgb(51,51,51)')
        .replace(/#000000/gi, '#333333');

    let out = out0;
    const root = /<svg\b([^>]*)>/u.exec(out);

    if (root) {
        const wm = /\bwidth="([\d.]+)"/u.exec(root[1]);
        const hm = /\bheight="([\d.]+)"/u.exec(root[1]);
        const sx = BAR_W / (wm ? parseFloat(wm[1]) : BAR_W);
        const sy = BAR_H / (hm ? parseFloat(hm[1]) : BAR_H);
        const scale = (attrs: string) =>
            attrs.replace(
                /\b(x|width|height|y)="(-?[\d.]+)"/gu,
                (_m, k: string, v: string) =>
                    `${k}="${Number(
                        (
                            parseFloat(v) *
                            (k === 'x' || k === 'width' ? sx : sy)
                        ).toFixed(3),
                    )}"`,
            );
        out = out.replace(
            root[0],
            `<svg width="${BAR_W}" height="${BAR_H}" viewBox="0 0 ${BAR_W} ${BAR_H}" version="1.1" xmlns="http://www.w3.org/2000/svg">`,
        );
        out = out.replace(
            /<rect\b([^>]*?)\/?>/gu,
            (_m, attrs: string) => `<rect${scale(attrs)}/>`,
        );
    }

    return (
        head + ',' + (b64 ? Buffer.from(out, 'utf8').toString('base64') : out)
    );
}

const styles = StyleSheet.create({
    page: {
        width: PAGE_W,
        height: PAGE_H,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        fontFamily: 'Inter',
        fontSize: 16,
        color: COLOR_BODY,
        backgroundColor: '#ffffff',
    },
    // При wrap={false} пагинация не задаёт странице высоту из size, и она
    // считается по потоковому контенту — все дети абсолютные, нужен явный блок.
    pageRoot: {
        width: PAGE_W,
        height: PAGE_H,
    },
    dataCol: {
        position: 'absolute',
        left: DATA_X,
        top: DATA_TOP,
        width: DATA_W,
        flexDirection: 'column',
        gap: BLOCK_GAP,
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        lineHeight: LH_TITLE,
        color: COLOR_HEAD,
    },
    article: {
        fontSize: 32,
        fontWeight: 700,
        lineHeight: LH_ARTICLE,
        color: COLOR_HEAD,
    },
    field: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: LH_BODY,
    },
    bold: { fontWeight: 700 },
    dataHeader: {
        flexDirection: 'column',
    },
    sizeBlock: {
        flexDirection: 'column',
        gap: 0,
    },

    eac: {
        position: 'absolute',
        left: EAC_X,
        top: EAC_Y,
    },
    barcodeBox: {
        position: 'absolute',
        width: BAR_W,
        height: BAR_H,
        left: BAR_CX - BAR_W / 2,
        top: BAR_CY - BAR_H / 2,
        transform: 'rotate(-90deg)',
    },
    barcodeImage: {
        // явные размеры: со 100% мерщик картинки держит пропорции SVG (380x78)
        // и высота выходит 70.6 вместо 75.78
        width: BAR_W,
        height: BAR_H,
        objectFit: 'fill',
    },
    barcodePlaceholder: {
        fontSize: 8,
        letterSpacing: 4,
        color: COLOR_GRAPH,
        textAlign: 'center',
    },
    numberBox: {
        position: 'absolute',
        width: NUM_BOX_W,
        height: 19,
        left: NUM_CX - NUM_BOX_W / 2,
        top: NUM_CY - 19 / 2,
        transform: 'rotate(-90deg)',
    },
    numberText: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: LH_BODY,
        letterSpacing: NUM_TRACKING,
        textAlign: 'center',
        color: COLOR_BODY,
    },
    regBox: {
        position: 'absolute',
        flexDirection: 'column',
        gap: 0,
        transform: 'rotate(-90deg)',
    },
    regLine: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: LH_REG,
        color: COLOR_BODY,
    },
});

// Геометрия повёрнутого (-90deg) бокса: центр совпадает с центром итогового
// прямоугольника. Высота в стиль не ставится (бокс авто: текст сам переносится),
// heightForCenter — расчётная высота для позиционирования.
function rotatedBox(
    left: number,
    bottom: number,
    width: number,
    heightForCenter: number,
) {
    return {
        position: 'absolute' as const,
        width,
        left: left + heightForCenter / 2 - width / 2,
        top: bottom - width / 2 - heightForCenter / 2,
        transform: 'rotate(-90deg)',
    };
}

function isKit(label: LabelData): boolean {
    if (/(комплект|набор)/iu.test(label.title)) {
        return true;
    }

    return label.is_kit;
}

function EacSign() {
    return (
        <Svg width={EAC_S} height={EAC_S} viewBox="0 0 32 32" fill="none">
            <Path
                d="M0 16V32H4.04246H8.08493V30.1316V28.2633H5.91083H3.73673V23.0658V17.8684H5.91083H8.08493V16V14.1316H5.91083H3.73673V8.93418V3.73673H5.91083H8.08493V1.86837V1.90735e-06H4.04246H0V16Z"
                fill={COLOR_GRAPH}
            />
            <Path
                d="M10.395 16V32H12.2634H14.1318V24.9342V17.8684H15.8642H17.5967V24.9342V32H19.4651H21.3335V16V1.90735e-06H15.8642H10.395V16ZM17.5967 8.93418V14.1316H15.8642H14.1318V8.93418V3.73673H15.8642H17.5967V8.93418Z"
                fill={COLOR_GRAPH}
            />
            <Path
                d="M23.5752 16V32H27.6516H31.7281V30.1316V28.2633H29.52H27.3119V16V3.73673H29.52H31.7281V1.86837V1.90735e-06H27.6516H23.5752V16Z"
                fill={COLOR_GRAPH}
            />
        </Svg>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Text style={styles.field}>
            <Text style={styles.bold}>{label}: </Text>
            <Text>{value}</Text>
        </Text>
    );
}

const SingleLabel = memo(function SingleLabel({
    label,
    mode = 'normal',
}: {
    label: LabelData;
    mode?: LabelMode;
}) {
    const { gap, headerGap } = MODES[mode];
    const localizedSize = formatSize(label.size);
    const sizeText = isKit(label)
        ? `${localizedSize} (комплект)`
        : localizedSize;

    const rawComposition = label.composition_raw?.trim()
        ? label.composition_raw
        : label.composition;

    const formattedComposition = rawComposition
        .replace(
            /\s*(Лицевая сторона\s*:|Наполнитель\s*:|Обратная сторона\s*:)/giu,
            '\n$1',
        )
        .trim();

    const barcodeUri = prepareBarcodeUri(label.barcode_data_uri);

    return (
        <View id="pageRoot" style={styles.pageRoot} wrap={false}>
            <View
                id={DATA_COL_ID}
                style={[styles.dataCol, { gap }]}
                wrap={false}
            >
                <View
                    style={[styles.dataHeader, { gap: headerGap }]}
                    wrap={false}
                >
                    <Text style={styles.title}>{label.title}</Text>
                    <Field label="Торговая марка" value={label.brand} />
                    <Text style={styles.article}>Артикул: {label.sku}</Text>
                </View>
                <View style={styles.sizeBlock} wrap={false}>
                    <Field label="Размер" value={sizeText} />
                    <Text style={styles.field}>
                        Допускается отклонение в размерах ± 1 см.
                    </Text>
                </View>
                <Field label="Срок годности" value="не ограничен" />
                <Field label="Состав" value={formattedComposition} />
                <Field label="Импортёр" value={label.importer_name} />
                <Field
                    label="Адрес"
                    value={formatAddress(label.importer_address)}
                />
                <Field label="Телефон" value={label.importer_phone} />
                <Field
                    label="Изготовитель"
                    value={
                        label.factory_name || label.manufacturer || 'Не указан'
                    }
                />
                <Field
                    label="Дата производства"
                    value={formatDate(label.manufacture_date)}
                />
            </View>

            <View style={styles.eac}>
                <EacSign />
            </View>

            <View style={styles.barcodeBox} wrap={false}>
                {barcodeUri ? (
                    <Image
                        source={barcodeUri}
                        style={styles.barcodeImage}
                        cache={true}
                    />
                ) : (
                    <Text style={styles.barcodePlaceholder}>
                        ||||| ШТРИХКОД |||||
                    </Text>
                )}
            </View>

            <View style={styles.numberBox} wrap={false}>
                <Text style={styles.numberText}>{label.barcode}</Text>
            </View>

            {label.regulation_text ? (
                <View
                    style={[
                        styles.regBox,
                        rotatedBox(REG_X0, REG_Y_BOTTOM, REG_W, REG_H),
                    ]}
                    wrap={false}
                >
                    <Text style={styles.regLine}>{label.regulation_text}</Text>
                </View>
            ) : null}
        </View>
    );
});

interface Props {
    labels: LabelData[];
    /** Режим каждой метки; без него — normal. */
    modes?: LabelMode[];
}

export default function TagLabelDocument({ labels, modes }: Props) {
    return (
        <Document
            title="FoHo — Бирка"
            author="FoHo Label System"
            subject="Бирка"
        >
            {labels.map((label, index) => (
                <Page
                    key={label.row}
                    size={[PAGE_W, PAGE_H]}
                    style={styles.page}
                    wrap={false}
                >
                    <SingleLabel
                        label={label}
                        mode={modes?.[index] ?? 'normal'}
                    />
                </Page>
            ))}
        </Document>
    );
}
