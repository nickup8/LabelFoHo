import { Document, Page } from '@react-pdf/renderer';
import { memo } from 'react';
import RecyclingSign from '@/components/Labels/RecyclingSign';
import {
    LABEL_HEIGHT,
    LABEL_WIDTH,
    VerticalLabel,
} from '@/components/Labels/VerticalLabelLayout';
import { formatSize } from '@/lib/utils';
import type { LabelData } from '@/types/labels';

const SingleLabel = memo(function SingleLabel({ label }: { label: LabelData }) {
    const isCircular = label.is_circular;

    const localizedSize = formatSize(label.size);
    const sizeText = isCircular
        ? `${localizedSize} (диаметр одного изделия)`
        : `${localizedSize} (размер одного изделия)`;

    return (
        <VerticalLabel
            label={label}
            sizeText={sizeText}
            headerSign={
                <RecyclingSign
                    recycleCode={label.recycle_code ?? '03'}
                    recycleLabel={label.recycle_label ?? 'PVC'}
                />
            }
        />
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
