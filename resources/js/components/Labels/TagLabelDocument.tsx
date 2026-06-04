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
});

const SingleLabel = memo(function SingleLabel({ label }: { label: LabelData }) {
    return (
        <View style={styles.page} wrap={false}>
            <Text>TagLabel — {label.title}</Text>
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
                <Page key={label.row} size={[LABEL_WIDTH, LABEL_HEIGHT]}>
                    <SingleLabel label={label} />
                </Page>
            ))}
        </Document>
    );
}
