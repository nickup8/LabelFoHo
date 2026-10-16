export interface ImporterCard {
    name: string;
    legal_address: string;
    phone: string;
}

/** Текст, когда карточка импортёра отсутствует. */
export const IMPORTER_MISSING_TEXT = 'Заполните данные импортёра';

/** Текст блока реквизитов импортёра — всегда из карточки. */
export function buildImporterText(card: ImporterCard | null): string {
    if (!card) {
        return IMPORTER_MISSING_TEXT;
    }

    return `Импортёр: ${card.name}\nАдрес: ${card.legal_address}\nТелефон: ${card.phone}`;
}
