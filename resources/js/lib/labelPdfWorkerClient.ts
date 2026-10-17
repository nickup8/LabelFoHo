import type { LabelData, LabelTemplateType } from '@/types/labels';

export interface LabelPdfWorkerRequest {
    id: number;
    labels: LabelData[];
    templateType: LabelTemplateType;
}

export type LabelPdfWorkerResponse =
    | { id: number; type: 'ready'; blob: Blob }
    | { id: number; type: 'fit-error'; errorSkus: string[] }
    | { id: number; type: 'error'; message: string };

interface JobHandlers {
    onReady: (blob: Blob) => void;
    onFitError: (errorSkus: string[]) => void;
    onError: (message: string) => void;
}

let jobSeq = 0;

/**
 * Запускает сборку PDF в отдельном Web Worker (decideModes + pdf().toBlob()).
 * Возвращает функцию отмены: worker terminate-ится, его ответы отбрасываются.
 */
export function runLabelPdfJob(
    labels: LabelData[],
    templateType: LabelTemplateType,
    handlers: JobHandlers,
): () => void {
    const id = ++jobSeq;
    const worker = new Worker(new URL('./labelPdfWorker.ts', import.meta.url), {
        type: 'module',
    });
    let active = true;

    const stop = () => {
        active = false;
        worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<LabelPdfWorkerResponse>) => {
        const message = event.data;

        if (!active || message.id !== id) {
            return;
        }

        stop();

        if (message.type === 'ready') {
            handlers.onReady(message.blob);
        } else if (message.type === 'fit-error') {
            handlers.onFitError(message.errorSkus);
        } else {
            handlers.onError(message.message);
        }
    };

    worker.onerror = (event: ErrorEvent) => {
        if (!active) {
            return;
        }

        stop();
        handlers.onError(
            event.message || 'Не удалось собрать PDF в Web Worker.',
        );
    };

    worker.postMessage({
        id,
        labels,
        templateType,
    } satisfies LabelPdfWorkerRequest);

    return stop;
}
