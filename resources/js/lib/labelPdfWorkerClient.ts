import type { LabelData, LabelTemplateType } from '@/types/labels';

export interface LabelPdfWorkerRequest {
    id: number;
    labels: LabelData[];
    templateType: LabelTemplateType;
}

/** Готовые файлы экспорта: общий PDF и ZIP с отдельными PDF. */
export interface LabelPdfFiles {
    /** Общий PDF со всеми метками. */
    blob: Blob;
    /** ZIP, где одна метка — один одностраничный PDF. */
    zip: Blob;
}

export type LabelPdfWorkerResponse =
    | { id: number; type: 'ready'; files: LabelPdfFiles }
    | { id: number; type: 'fit-error'; errorSkus: string[] }
    | { id: number; type: 'error'; message: string };

interface JobHandlers {
    onReady: (files: LabelPdfFiles) => void;
    onFitError: (errorSkus: string[]) => void;
    onError: (message: string) => void;
}

let jobSeq = 0;

/**
 * Запускает сборку файлов экспорта в отдельном Web Worker (decideModes,
 * pdf().toBlob(), ZIP через fflate). Возвращает функцию отмены: worker
 * terminate-ится, его ответы отбрасываются.
 */
export function runLabelPdfJob(
    labels: LabelData[],
    templateType: LabelTemplateType,
    handlers: JobHandlers,
): () => void {
    const id = ++jobSeq;
    let active = true;
    let bootstrapUrl: string | null = null;

    let worker: Worker;

    try {
        if (import.meta.env.DEV) {
            // В dev Vite не всегда отдаёт module Worker как Blob («?worker&inline»
            // в обычном установленном Vite не создаёт Blob), поэтому собираем
            // bootstrap-Blob с import абсолютного URL labelPdfWorker.ts.
            const workerModuleUrl = new URL(
                './labelPdfWorker.ts',
                import.meta.url,
            ).href;

            const bootstrapSource = `import ${JSON.stringify(workerModuleUrl)};\n`;
            bootstrapUrl = URL.createObjectURL(
                new Blob([bootstrapSource], {
                    type: 'text/javascript',
                }),
            );

            worker = new Worker(bootstrapUrl, { type: 'module' });
        } else {
            worker = new Worker(
                new URL('./labelPdfWorker.ts', import.meta.url),
                { type: 'module' },
            );
        }
    } catch (error) {
        if (bootstrapUrl !== null) {
            URL.revokeObjectURL(bootstrapUrl);
        }

        handlers.onError(
            error instanceof Error
                ? error.message
                : 'Не удалось запустить Web Worker для PDF.',
        );

        return () => {};
    }

    const stop = () => {
        active = false;
        worker.terminate();

        if (bootstrapUrl !== null) {
            URL.revokeObjectURL(bootstrapUrl);
            bootstrapUrl = null;
        }
    };

    worker.onmessage = (event: MessageEvent<LabelPdfWorkerResponse>) => {
        const message = event.data;

        if (!active || message.id !== id) {
            return;
        }

        stop();

        if (message.type === 'ready') {
            handlers.onReady(message.files);
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
