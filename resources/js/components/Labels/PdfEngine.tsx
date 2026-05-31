import { useEffect, useRef, useMemo } from 'react';
import { usePDF } from '@react-pdf/renderer';
import FoHoLabelDocument from '@/components/Labels/FoHoLabelDocument';
import type { LabelData } from '@/types/labels';

interface PdfEngineProps {
    labels: LabelData[];
    onReady: (blob: Blob) => void;
}

export default function PdfEngine({ labels, onReady }: PdfEngineProps) {
    const memoizedDocument = useMemo(
        () => <FoHoLabelDocument labels={labels} />,
        [labels],
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
