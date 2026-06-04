import { useEffect, useRef, useMemo } from 'react';
import { usePDF } from '@react-pdf/renderer';
import NapkinLabelDocument from '@/components/Labels/NapkinLabelDocument';
import MatLabelDocument from '@/components/Labels/MatLabelDocument';
import TagLabelDocument from '@/components/Labels/TagLabelDocument';
import type { LabelData, LabelTemplateType } from '@/types/labels';

interface PdfEngineProps {
    labels: LabelData[];
    templateType: LabelTemplateType;
    onReady: (blob: Blob) => void;
}

const documentComponents = {
    napkin: NapkinLabelDocument,
    mat: MatLabelDocument,
    tag: TagLabelDocument,
} as const;

export default function PdfEngine({ labels, templateType, onReady }: PdfEngineProps) {
    const DocumentComponent = documentComponents[templateType];

    const memoizedDocument = useMemo(
        () => <DocumentComponent labels={labels} />,
        [labels, DocumentComponent],
    );
    const [pdfInstance] = usePDF({ document: memoizedDocument });
    const done = useRef(false);

    useEffect(() => {
        if (!pdfInstance.loading && pdfInstance.blob && !done.current) {
            done.current = true;
            onReady(pdfInstance.blob);
        }
    }, [pdfInstance.loading, pdfInstance.blob, onReady]);

    return null;
}
