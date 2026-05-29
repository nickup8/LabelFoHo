import {
    Document,
    Page,
    View,
    Text,
    Image,
    Svg,
    Path,
    Font,
    StyleSheet,
} from '@react-pdf/renderer';
import type { LabelData } from '@/types/labels';

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
        borderWidth: 1,
        borderColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    barcodeImage: {
        width: 350,
        height: '100%',
    },
    barcodeNumber: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 16,
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

function FoHoLogoSvg() {
    return (
        <Svg width={62} height={62} viewBox="0 0 62 62">
            <Path
                fill="#333333"
                d="M56.2743 33.4345L48.6255 20.1862L48.0912 24.0098L44.2735 22.6988L51.9405 35.9788L51.9807 36.0461C52.5005 36.8864 52.7752 37.8553 52.7737 38.8434C52.7737 41.7538 50.4259 44.1264 47.5247 44.1663L47.4917 44.164L47.4076 44.167H37.0553V40.8168L29.6328 46.6796L37.0553 52.5424V49.1922H47.4612L47.49 49.1919C53.1781 49.1706 57.799 44.5363 57.799 38.8434C57.8007 36.9341 57.2729 35.0618 56.2743 33.4345ZM25.3024 46.5816L27.815 44.1671H14.5448C12.6489 44.1671 10.8825 43.147 9.93477 41.5053C8.98701 39.8635 8.98701 37.8234 9.93444 36.1816L14.6141 28.0767L17.4826 29.7707L16.2088 20.3981L7.38612 23.8077L10.2869 25.521L5.58238 33.6693C3.74012 36.8609 3.74012 40.8262 5.58238 44.0179C7.42532 47.2094 10.8596 49.1924 14.5448 49.1924H27.815L25.3024 46.5816ZM19.2689 20.0147L26.386 7.68666C27.3341 6.04507 29.1005 5.02528 30.9964 5.02528C32.8919 5.02528 34.6586 6.04507 35.6064 7.68683L39.5772 14.5649L36.5677 16.2476L45.3073 19.8651L46.8025 10.5254L43.9643 12.1124L39.9586 5.17436C38.1155 1.98264 34.6816 0 30.9964 0C27.3108 0 23.8769 1.98264 22.034 5.17419L14.9168 17.5022L18.6563 16.2295L19.2689 20.0147Z"
            />
            <Path
                fill="#333333"
                d="M31.1142 34.8274H30.8818C29.7391 34.8274 28.8282 34.249 28.6744 32.5143H24.9371C25.0235 36.0794 27.0211 38.0805 30.9979 38.0805C34.9711 38.0805 37.0622 35.8266 37.0622 32.2716V31.8299C37.0622 28.2748 34.9711 26.021 31.1837 26.021C30.1845 26.021 29.255 26.23 28.4417 26.5785L28.4384 22.9073H36.323V19.6543H25.0894L25.0723 29.5995L28.2556 30.6913C28.7434 29.7157 29.8359 29.2507 30.7885 29.2507H30.9279C32.2755 29.2507 33.3444 29.9943 33.3444 31.9227V32.1781C33.3449 34.107 32.276 34.8274 31.1142 34.8274ZM27.0201 52.8749H23.5895V61.9999H25.7606V58.7243H27.0202C28.7221 58.7243 30.6522 58.3501 30.6522 55.9165V55.6827C30.652 53.261 28.722 52.8749 27.0201 52.8749ZM28.4541 55.8584C28.4541 56.8877 27.7037 57.0866 27.114 57.0866H25.7606V54.5128H27.114C27.7037 54.5128 28.4541 54.7118 28.4541 55.7413V55.8584ZM35.1809 52.8749H31.7504V61.9999H33.9214V58.7243H35.1811C36.883 58.7243 38.813 58.3501 38.813 55.9165V55.6827C38.8127 53.261 36.8828 52.8749 35.1809 52.8749ZM36.6148 55.8584C36.6148 56.8877 35.8644 57.0866 35.2747 57.0866H33.9213V54.5128H35.2747C35.8644 54.5128 36.6148 54.7118 36.6148 55.7413V55.8584Z"
            />
        </Svg>
    );
}

function SingleLabel({ label }: { label: LabelData }) {
    const sizeText = label.is_circular
        ? `${label.size} (диаметр одного изделия)`
        : label.size;

    return (
        <View style={styles.page} wrap={false}>
            <View style={styles.header}>
                <Text style={styles.title}>{label.title}</Text>
                <View style={styles.logo}>
                    <FoHoLogoSvg />
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

                <View style={styles.row}>
                    <Text style={styles.label}>Адрес: </Text>
                    <Text style={styles.value}>{label.importer_address}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Телефон: </Text>
                    <Text style={styles.value}>{label.importer_phone}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Изготовитель: </Text>
                    <Text style={styles.value}>{label.manufacturer}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Дата производства: </Text>
                    <Text style={styles.value}>
                        {label.manufacture_date ?? ''}
                    </Text>
                </View>

                {/* {label.certification_marks.length > 0 && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Сертификация: </Text>
                        <Text style={styles.value}>
                            {label.certification_marks.join(', ')}
                        </Text>
                    </View>
                )} */}

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
                    />
                ) : (
                    <Text
                        style={{
                            fontSize: 8,
                            letterSpacing: 4,
                            color: '#a3a3a3',
                        }}
                    >
                        ||||| ШТРИХКОД |||||
                    </Text>
                )}
            </View>

            <Text style={styles.barcodeNumber}>{label.barcode}</Text>
        </View>
    );
}

interface Props {
    labels: LabelData[];
}

export default function FoHoLabelDocument({ labels }: Props) {
    return (
        <Document
            title="Этикетки FoHo"
            author="FoHo Label System"
            subject="Этикетки для маркировки товаров"
        >
            {labels.map((label) => (
                <Page key={label.row} size={[LABEL_WIDTH, LABEL_HEIGHT]}>
                    <SingleLabel label={label} />
                </Page>
            ))}
        </Document>
    );
}
