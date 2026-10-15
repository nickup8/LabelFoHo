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

// Геометрия горизонтальной бирки 712 x 419 (pt берутся напрямую)
const PAGE_W = 712;
const PAGE_H = 419;

const MARGIN = { top: 20, right: 20, bottom: 16, left: 20 };

// Колонки контента: 458 + 10 + 38 + 10 + 156 = 672 = 712 - 20 - 20
const DATA_W = 458;
const EAC_W = 38;
const RIGHT_W = 156;
const COL_GAP = 10;

// Правый блок: штрихкод 76 | зазор 6 | номер 22 | зазор 8 | техрегламент 44 (= 156)
const BARCODE_SLOT_W = 76;
const NUMBER_SLOT_W = 22;
const REG_SLOT_W = 44;
const SLOT_GAP_1 = 6;
const SLOT_GAP_2 = 8;

// Неповёрнутый бокс штрихкода (поворот -90deg вокруг центра -> визуально 72 x 350)
const BARCODE_BOX_W = 350;
const BARCODE_BOX_H = 72;

const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right; // 672
const CONTENT_H = PAGE_H - MARGIN.top - MARGIN.bottom; // 383

const styles = StyleSheet.create({
    page: {
        width: PAGE_W,
        height: PAGE_H,
        paddingTop: MARGIN.top,
        paddingRight: MARGIN.right,
        paddingBottom: MARGIN.bottom,
        paddingLeft: MARGIN.left,
        fontFamily: 'Inter',
        fontSize: 16,
        lineHeight: 1.25,
        backgroundColor: '#ffffff',
        color: '#000000',
    },
    content: {
        flexDirection: 'row',
        columnGap: COL_GAP,
        width: CONTENT_W,
        height: CONTENT_H,
    },

    // --- левая зона данных: один столбец ---
    dataCol: {
        width: DATA_W,
        height: CONTENT_H,
        flexDirection: 'column',
        gap: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.1,
    },
    article: {
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.2,
    },
    field: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.25,
    },
    bold: { fontWeight: 700 },
    sizeBlock: {
        gap: 0,
    },

    // --- EAC: верх знака совпадает с верхом штрихкода ---
    eacCol: {
        width: EAC_W,
        height: CONTENT_H,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: (CONTENT_H - BARCODE_BOX_W) / 2,
    },

    // --- правый блок ---
    rightCol: {
        width: RIGHT_W,
        height: CONTENT_H,
        flexDirection: 'row',
        columnGap: 0,
    },
    slot: {
        height: CONTENT_H,
    },
    barcodeSlot: {
        width: BARCODE_SLOT_W,
        position: 'relative',
    },
    numberSlot: {
        width: NUMBER_SLOT_W,
        marginLeft: SLOT_GAP_1,
        position: 'relative',
    },
    regSlot: {
        width: REG_SLOT_W,
        marginLeft: SLOT_GAP_2,
        position: 'relative',
    },

    // ВАЖНО: overflow:hidden на повёрнутом боксе штрихкода не ставить.
    // В @react-pdf/renderer clip для overflow:hidden выпускается ДО
    // applyTransformations, поэтому «hidden» обрезает штрихи по
    // неповёрнутому боксу 350x72.
    barcodeRotated: {
        position: 'absolute',
        width: BARCODE_BOX_W,
        height: BARCODE_BOX_H,
        left: (BARCODE_SLOT_W - BARCODE_BOX_W) / 2,
        top: (CONTENT_H - BARCODE_BOX_H) / 2,
        transform: 'rotate(-90deg)',
    },
    barcodeImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    barcodePlaceholder: {
        fontSize: 8,
        letterSpacing: 4,
        color: '#a3a3a3',
        textAlign: 'center',
    },

    numberRotatedBox: {
        position: 'absolute',
        width: 130,
        height: 20,
        left: (NUMBER_SLOT_W - 130) / 2,
        top: (CONTENT_H - 20) / 2,
        transform: 'rotate(-90deg)',
    },
    numberText: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.2,
        textAlign: 'center',
    },

    // Длина бокса = высоте контента (383 pt): самая длинная строка ТР
    // умещается без переноса на третью колонку и без выхода за поля.
    regRotatedBox: {
        position: 'absolute',
        width: 383,
        height: 34,
        left: (REG_SLOT_W - 383) / 2,
        top: (CONTENT_H - 34) / 2,
        transform: 'rotate(-90deg)',
    },
    regLine: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.2,
        marginTop: 0,
        marginBottom: 0,
        textAlign: 'center',
    },
});

function isKit(label: LabelData): boolean {
    if (/(комплект|набор)/iu.test(label.title)) {
        return true;
    }

    return label.is_kit;
}

function EacSign() {
    return (
        <Svg width={38} height={38} viewBox="0 0 32 32" fill="none">
            <Path d="M0 16V32H4.04246H8.08493V30.1316V28.2633H5.91083H3.73673V23.0658V17.8684H5.91083H8.08493V16V14.1316H5.91083H3.73673V8.93418V3.73673H5.91083H8.08493V1.86837V1.90735e-06H4.04246H0V16Z" fill="#333333" />
            <Path d="M10.395 16V32H12.2634H14.1318V24.9342V17.8684H15.8642H17.5967V24.9342V32H19.4651H21.3335V16V1.90735e-06H15.8642H10.395V16ZM17.5967 8.93418V14.1316H15.8642H14.1318V8.93418V3.73673H15.8642H17.5967V8.93418Z" fill="#333333" />
            <Path d="M23.5752 16V32H27.6516H31.7281V30.1316V28.2633H29.52H27.3119V16V3.73673H29.52H31.7281V1.86837V1.90735e-06H27.6516H23.5752V16Z" fill="#333333" />
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

const SingleLabel = memo(function SingleLabel({ label }: { label: LabelData }) {
    const localizedSize = formatSize(label.size);
    const sizeText = isKit(label) ? `${localizedSize} (комплект)` : localizedSize;

    const rawComposition = label.composition_raw?.trim()
        ? label.composition_raw
        : label.composition;

    const formattedComposition = rawComposition
        .replace(
            /\s*(Лицевая сторона\s*:|Наполнитель\s*:|Обратная сторона\s*:)/giu,
            '\n$1',
        )
        .trim();

    // Кавычки уже есть в regulation_text — строки только разделяются, без добавления «»
    const regLines = (label.regulation_text || '')
        .replace(/\s*«/u, '\n«')
        .split('\n')
        .filter((l) => l.trim());

    return (
        <View style={styles.content} wrap={false}>
            <View style={styles.dataCol} wrap={false}>
                <Text style={styles.title}>{label.title}</Text>
                <Field label="Торговая марка" value={label.brand} />
                <Text style={styles.article}>Артикул: {label.sku}</Text>
                <View style={styles.sizeBlock}>
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

            <View style={styles.eacCol}>
                <EacSign />
            </View>

            <View style={styles.rightCol}>
                <View style={[styles.slot, styles.barcodeSlot]}>
                    <View style={styles.barcodeRotated}>
                        {label.barcode_data_uri ? (
                            <Image
                                source={label.barcode_data_uri}
                                style={styles.barcodeImage}
                                cache={true}
                            />
                        ) : (
                            <Text style={styles.barcodePlaceholder}>
                                ||||| ШТРИХКОД |||||
                            </Text>
                        )}
                    </View>
                </View>

                <View style={[styles.slot, styles.numberSlot]}>
                    <View style={styles.numberRotatedBox}>
                        <Text style={styles.numberText}>{label.barcode}</Text>
                    </View>
                </View>

                <View style={[styles.slot, styles.regSlot]}>
                    <View style={styles.regRotatedBox}>
                        {regLines.map((line, i) => (
                            <Text key={i} style={styles.regLine}>
                                {line}
                            </Text>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
});

interface Props {
    labels: LabelData[];
}

export default function TagLabelDocument({ labels }: Props) {
    return (
        <Document
            title="FoHo — Бирка"
            author="FoHo Label System"
            subject="Бирка"
        >
            {labels.map((label) => (
                <Page
                    key={label.row}
                    size={[PAGE_W, PAGE_H]}
                    style={styles.page}
                    wrap={false}
                >
                    <SingleLabel label={label} />
                </Page>
            ))}
        </Document>
    );
}
