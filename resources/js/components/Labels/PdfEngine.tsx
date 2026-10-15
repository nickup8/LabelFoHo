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
    onError: (message: string) => void;
}

const documentComponents = {
    napkin: NapkinLabelDocument,
    mat: MatLabelDocument,
    tag: TagLabelDocument,
} as const;

export default function PdfEngine({ labels, templateType, onReady, onError }: PdfEngineProps) {
    const DocumentComponent = documentComponents[templateType];

    const memoizedDocument = useMemo(
        () => <DocumentComponent labels={labels} />,
        [labels, DocumentComponent],
    );
    const [pdfInstance] = usePDF({ document: memoizedDocument });
    const settled = useRef(false);

    useEffect(() => {
        if (settled.current) {
            return;
        }

        if (pdfInstance.error) {
            settled.current = true;
            onError(pdfInstance.error);

            return;
        }

        if (!pdfInstance.loading && pdfInstance.blob) {
            settled.current = true;
            onReady(pdfInstance.blob);
        }
    }, [pdfInstance.loading, pdfInstance.blob, pdfInstance.error, onReady, onError]);

    return null;
}
