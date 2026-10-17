import { Font, pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import MatLabelDocument from '@/components/Labels/MatLabelDocument';
import NapkinLabelDocument from '@/components/Labels/NapkinLabelDocument';
import TagLabelDocument from '@/components/Labels/TagLabelDocument';
import type { LabelMode } from '@/components/Labels/TagLabelDocument';
import { decideModes } from '@/lib/labelFit';
import type {
    LabelPdfWorkerRequest,
    LabelPdfWorkerResponse,
} from '@/lib/labelPdfWorkerClient';
import type { LabelData, LabelTemplateType } from '@/types/labels';

// URL шрифтов строятся от origin: в worker относительный путь разрешается от
// адреса скрипта worker (public/build/assets/…), а не от корня сайта.
const fontUrl = (path: string): string =>
    new URL(path, globalThis.location.origin).href;

Font.register({
    family: 'Inter',
    fonts: [
        { src: fontUrl('/fonts/Inter-Regular.ttf'), fontWeight: 400 },
        { src: fontUrl('/fonts/Inter-Bold.ttf'), fontWeight: 700 },
    ],
});

const workerScope = globalThis as unknown as {
    addEventListener(
        type: 'message',
        listener: (event: MessageEvent<LabelPdfWorkerRequest>) => void,
    ): void;
    postMessage(message: LabelPdfWorkerResponse): void;
};

function post(message: LabelPdfWorkerResponse): void {
    workerScope.postMessage(message);
}

function errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

async function documentBlob(
    labels: LabelData[],
    templateType: LabelTemplateType,
    modes?: LabelMode[],
): Promise<Blob> {
    // pdf() типизирован под <Document/>, а здесь обёртка компонента.
    const element = (
        templateType === 'tag'
            ? createElement(TagLabelDocument, { labels, modes })
            : templateType === 'mat'
              ? createElement(MatLabelDocument, { labels })
              : createElement(NapkinLabelDocument, { labels })
    ) as ReactElement<DocumentProps>;

    return pdf(element).toBlob();
}

async function handleJob({
    id,
    labels,
    templateType,
}: LabelPdfWorkerRequest): Promise<void> {
    if (templateType !== 'tag') {
        post({
            id,
            type: 'ready',
            blob: await documentBlob(labels, templateType),
        });

        return;
    }

    let modes: LabelMode[];

    try {
        const fit = await decideModes(labels);

        if (fit.errorSkus.length > 0) {
            post({ id, type: 'fit-error', errorSkus: fit.errorSkus });

            return;
        }

        modes = fit.modes;
    } catch (error) {
        post({ id, type: 'error', message: errorText(error) });

        return;
    }

    post({
        id,
        type: 'ready',
        blob: await documentBlob(labels, templateType, modes),
    });
}

workerScope.addEventListener('message', (event) => {
    const request = event.data;

    handleJob(request).catch((error: unknown) => {
        post({ id: request.id, type: 'error', message: errorText(error) });
    });
});
