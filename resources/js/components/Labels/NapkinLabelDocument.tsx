import { memo } from 'react';
import {
    Document,
    Page,
    View,
    Text,
    Image,
    Font,
    StyleSheet,
} from '@react-pdf/renderer';
import type { LabelData } from '@/types/labels';
import RecyclingSign from '@/components/Labels/RecyclingSign';

function capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    if (/[а-яё]/i.test(dateStr)) return capitalizeFirstLetter(dateStr);
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return capitalizeFirstLetter(
        d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    );
}

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

const LABEL_WIDTH = 469;
const LABEL_HEIGHT = 634;

const styles = StyleSheet.create({
    page: {
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        paddingTop: 28,
        paddingRight: 24,
        paddingBottom: 16,
        paddingLeft: 28,
        fontFamily: 'Roboto',
        fontSize: 16,
        lineHeight: 1.2,
        backgroundColor: '#ffffff',
        color: '#000000',
    },
    header: {
        position: 'relative',
        width: '100%',
        marginBottom: 16,
    },
    title: {
        maxWidth: 324,
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.1,
        marginBottom: 16,
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
        gap: 6,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontWeight: 700,
    },
    value: {},
    tolerance: {
        marginTop: -2,
        fontSize: 16,
    },
    labelText: {
        lineHeight: 1.2,
    },
    boldText: {
        fontWeight: 700,
    },
    regularText: { fontWeight: 400 },
    regulation: {
        marginTop: 12,
    },
    regulationLine: {
        marginTop: 0,
    },
    regulationLineTight: {
        marginTop: -2,
    },
    barcodeSection: {
        marginTop: 20,
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
        marginTop: 8,
        textAlign: 'center',
        fontSize: 16,
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

const SingleLabel = memo(function SingleLabel({ label }: { label: LabelData }) {
    const sizeText = label.is_circular
        ? `${label.size} (диаметр одного изделия)`
        : label.size;

    const formattedAddress = (label.importer_address || '')
        .replace(/пос\.\s+/g, 'пос.\u00A0')
        .replace(/ул\.\s+/g, 'ул.\u00A0')
        .replace(/г\.\s+/g, 'г.\u00A0');

    return (
        <View style={styles.page} wrap={false}>
            <View style={styles.header}>
                <Text style={styles.title}>{label.title}</Text>
                <View style={styles.logo}>
                    <RecyclingSign recycleCode={label.recycle_code} recycleLabel={label.recycle_label} />
                </View>
            </View>

            <View style={styles.details}>
                <View style={styles.row}>
                    <Text style={styles.label}>Торговая марка: </Text>
                    <Text style={styles.value}>{label.brand}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Артикул: </Text>
                    <Text style={styles.value}>{label.sku}</Text>
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

                <View style={styles.row}>
                    <Text style={styles.label}>Состав: </Text>
                    <Text style={styles.value}>{label.composition}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Импортёр: </Text>
                    <Text style={styles.value}>{label.importer_name}</Text>
                </View>

                <Text style={styles.labelText}>
                    <Text style={styles.boldText}>Адрес: </Text>
                    <Text style={styles.regularText}>{formattedAddress}</Text>
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
});

interface Props {
    labels: LabelData[];
}

export default function NapkinLabelDocument({ labels }: Props) {
    return (
        <Document
            title="Этикетки FoHo — Наклейка (салфетки)"
            author="FoHo Label System"
            subject="Наклейка для салфеток"
        >
            {labels.map((label) => (
                <Page key={label.row} size={[LABEL_WIDTH, LABEL_HEIGHT]}>
                    <SingleLabel label={label} />
                </Page>
            ))}
        </Document>
    );
}
