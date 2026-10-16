import { usePDF } from '@react-pdf/renderer';
import { useEffect, useRef, useMemo } from 'react';
import MatLabelDocument from '@/components/Labels/MatLabelDocument';
import NapkinLabelDocument from '@/components/Labels/NapkinLabelDocument';
import TagLabelDocument from '@/components/Labels/TagLabelDocument';
import type { LabelMode } from '@/components/Labels/TagLabelDocument';
import type { LabelData, LabelTemplateType } from '@/types/labels';

interface PdfEngineProps {
    labels: LabelData[];
    templateType: LabelTemplateType;
    /** Режимы левого столбца бирок (только templateType === 'tag'). */
    modes?: LabelMode[] | null;
    onReady: (blob: Blob) => void;
    onError: (message: string) => void;
}

const documentComponents = {
    napkin: NapkinLabelDocument,
    mat: MatLabelDocument,
} as const;

export default function PdfEngine({
    labels,
    templateType,
    modes,
    onReady,
    onError,
}: PdfEngineProps) {
    const memoizedDocument = useMemo(() => {
        if (templateType === 'tag') {
            return (
                <TagLabelDocument labels={labels} modes={modes ?? undefined} />
            );
        }

        const DocumentComponent = documentComponents[templateType];

        return <DocumentComponent labels={labels} />;
    }, [labels, templateType, modes]);
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
