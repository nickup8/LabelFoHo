import { View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { LabelData } from '@/types/labels';

export function capitalizeFirstLetter(str: string): string {
    if (!str) {
        return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) {
        return '';
    }

    if (/[а-яё]/i.test(dateStr)) {
        return capitalizeFirstLetter(dateStr);
    }

    const d = new Date(dateStr + 'T00:00:00');

    if (isNaN(d.getTime())) {
        return dateStr;
    }

    return capitalizeFirstLetter(
        d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    );
}

export function formatAddress(address: string): string {
    return (address || '')
        .replace(/пос\.\s+/g, 'пос.\u00A0')
        .replace(/ул\.\s+/g, 'ул.\u00A0')
        .replace(/г\.\s+/g, 'г.\u00A0');
}

Font.register({
    family: 'Inter',
    fonts: [
        { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
    ],
});

// Roboto остаётся только для текста внутри RecyclingSign (знаки не меняем)
Font.register({
    family: 'Roboto',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
            fontWeight: 400,
        },
        {
            src: 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
            fontWeight: 700,
        },
    ],
});

Font.registerHyphenationCallback((word) => [word]);

export const LABEL_WIDTH = 469;
export const LABEL_HEIGHT = 634;

export const styles = StyleSheet.create({
    page: {
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        paddingTop: 28,
        paddingRight: 24,
        paddingBottom: 16,
        paddingLeft: 28,
        fontFamily: 'Inter',
        fontSize: 16,
        lineHeight: 1.2,
        backgroundColor: '#ffffff',
        color: '#000000',
    },
    header: {
        position: 'relative',
        width: '100%',
        marginBottom: 4,
    },
    title: {
        maxWidth: 324,
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.1,
        marginBottom: 6,
    },
    titleWide: {
        maxWidth: '100%',
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.1,
        marginBottom: 6,
    },
    logo: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 62,
        height: 62,
    },
    details: {
        flexDirection: 'column',
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        columnGap: 4,
    },
    label: {
        fontWeight: 700,
        flexShrink: 0,
    },
    value: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
    },
    article: {
        fontWeight: 700,
        fontSize: 32,
        lineHeight: 1.2,
    },
    articleRow: {
        flexDirection: 'row',
        columnGap: 4,
        alignItems: 'flex-start',
        flexShrink: 0,
        minHeight: 39,
    },
    tolerance: {
        marginTop: 0,
    },
    labelText: {
        lineHeight: 1.2,
    },
    boldText: {
        fontWeight: 700,
    },
    regularText: { fontWeight: 400 },
    regulation: {
        marginTop: 0,
    },
    regulationLine: {
        marginTop: 0,
        fontSize: 14,
    },
    regulationLineTight: {
        marginTop: 0,
        fontSize: 14,
    },
    marksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginTop: 8,
    },
    matMarksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
    },
    eacMark: {
        fontWeight: 700,
        fontSize: 22,
        lineHeight: 1.1,
        letterSpacing: 1,
    },
    barcodeSection: {
        marginTop: 8,
        width: '100%',
        height: 78,
        overflow: 'hidden',
    },
    barcodeImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    barcodeNumber: {
        marginTop: 4,
        textAlign: 'center',
    },
    barcodePlaceholder: {
        fontSize: 8,
        letterSpacing: 4,
        color: '#a3a3a3',
    },
    recycleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recycleBox: {
        borderWidth: 1.5,
        borderColor: '#000000',
        width: 42,
        paddingVertical: 2,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    recycleCode: {
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1,
    },
    recycleName: {
        fontWeight: 700,
        fontSize: 8,
        lineHeight: 1,
        marginTop: 1,
    },
});

interface VerticalLabelProps {
    label: LabelData;
    sizeText: string;
    headerSign?: ReactNode;
    marks?: ReactNode;
}

export function VerticalLabel({
    label,
    sizeText,
    headerSign,
    marks,
}: VerticalLabelProps) {
    return (
        <View style={styles.page} wrap={false}>
            <View style={styles.header}>
                <Text style={headerSign ? styles.title : styles.titleWide}>
                    {label.title}
                </Text>
                {headerSign ? (
                    <View style={styles.logo}>{headerSign}</View>
                ) : null}
            </View>

            <View style={styles.details}>
                <View style={styles.row}>
                    <Text style={styles.label}>Торговая марка: </Text>
                    <Text style={styles.value}>{label.brand}</Text>
                </View>

                <View style={styles.articleRow}>
                    <Text style={[styles.label, styles.article]}>
                        Артикул:{' '}
                    </Text>
                    <Text style={[styles.value, styles.article]}>
                        {label.sku}
                    </Text>
                </View>

                <View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Размер: </Text>
                        <Text style={styles.value}>{sizeText}</Text>
                    </View>
                    <Text style={styles.tolerance}>
                        Допускается отклонение в размерах ± 1 см.
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Срок годности: </Text>
                    <Text style={styles.value}>не ограничен</Text>
                </View>

                {/\n\s*(?:Лицевая сторона|Наполнитель|Обратная сторона)\s*:/iu.test(
                    label.composition,
                ) ? (
                    <Text style={styles.labelText}>
                        <Text style={styles.boldText}>Состав: </Text>
                        <Text style={styles.regularText}>
                            {label.composition}
                        </Text>
                    </Text>
                ) : (
                    <View style={styles.row}>
                        <Text style={styles.label}>Состав: </Text>
                        <Text style={styles.value}>{label.composition}</Text>
                    </View>
                )}

                <View style={styles.row}>
                    <Text style={styles.label}>Импортёр: </Text>
                    <Text style={styles.value}>{label.importer_name}</Text>
                </View>

                <Text style={styles.labelText}>
                    <Text style={styles.boldText}>Адрес: </Text>
                    <Text style={styles.regularText}>
                        {formatAddress(label.importer_address)}
                    </Text>
                </Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Телефон: </Text>
                    <Text style={styles.value}>{label.importer_phone}</Text>
                </View>

                <Text style={styles.labelText}>
                    <Text style={styles.boldText}>Изготовитель: </Text>
                    <Text style={styles.regularText}>
                        {label.factory_name ||
                            label.manufacturer ||
                            'Не указан'}
                    </Text>
                </Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Дата производства: </Text>
                    <Text style={styles.value}>
                        {formatDate(label.manufacture_date)}
                    </Text>
                </View>

                <View style={styles.regulation}>
                    <Text style={styles.regulationLine}>
                        Соответствует требованиям ТР ТС 017/2011
                    </Text>
                    <Text style={styles.regulationLineTight}>
                        «О безопасности продукции легкой промышленности»
                    </Text>
                </View>
            </View>

            {marks}

            <View style={styles.barcodeSection}>
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

            <Text style={styles.barcodeNumber}>{label.barcode}</Text>
        </View>
    );
}
