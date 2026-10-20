import { zipSync } from 'fflate';
import type { LabelData } from '@/types/labels';

/** Недопустимые в имени файла символы (Windows/ZIP) — заменяются на «_». */
const INVALID_NAME_CHARS = /[\p{Cc}<>:"/\\|?*]/gu;

export interface PdfZipEntry {
    /** Имя файла внутри архива, например RKK006B-100.pdf */
    name: string;
    data: Uint8Array;
}

/**
 * Имена файлов в архиве строго по артикулу, без номера строки.
 * При совпадении имён добавляется _2, _3… перед .pdf — ничего не перезаписывается.
 */
export function buildZipEntryNames(labels: LabelData[]): string[] {
    const used = new Set<string>();

    return labels.map((label) => {
        const base = label.sku.replace(INVALID_NAME_CHARS, '_');
        let name = `${base}.pdf`;
        let copy = 1;

        while (used.has(name.toLowerCase())) {
            copy += 1;
            name = `${base}_${copy}.pdf`;
        }

        used.add(name.toLowerCase());

        return name;
    });
}

/** Собирает ZIP из готовых PDF-байтов. Вызывается только в Web Worker. */
export function zipPdfEntries(entries: PdfZipEntry[]): Blob {
    const files: Record<string, Uint8Array> = {};

    for (const entry of entries) {
        files[entry.name] = entry.data;
    }

    return new Blob([zipSync(files)], { type: 'application/zip' });
}
