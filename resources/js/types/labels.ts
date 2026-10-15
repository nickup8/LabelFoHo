export type LabelTemplateType = 'napkin' | 'mat' | 'tag';

/** Реквизиты импортёра, используемые в ответе /labels/download */
export interface ImporterRequisites {
    id: number;
    name: string;
    address: string;
    phone: string;
}

export interface LabelTemplate {
    id: number;
    title: string;
    manufacturer_name: string;
    default_width_px: number;
    default_height_px: number;
    is_active: boolean;
    template_type: LabelTemplateType;
    canvas_elements?: unknown;
    created_at: string;
    updated_at: string;
}

/** Одна этикетка для клиентской печати через @react-pdf/renderer */
export interface LabelData {
    row: number | null;
    title: string;
    brand: string;
    sku: string;
    size: string;
    is_circular: boolean;
    is_kit: boolean;
    composition: string;
    composition_raw: string;
    importer_name: string;
    importer_address: string;
    importer_phone: string;
    manufacturer: string;
    factory_name: string;
    manufacture_date: string | null;
    barcode: string;
    barcode_data_uri: string | null;
    recycle_code: string | null;
    recycle_label: string | null;
    certification_marks: string[];
    regulation_text: string;
}

/** Ответ эндпоинта /labels/download */
export interface LabelsDownloadResponse {
    session_id: string;
    template_id: string;
    template_type: LabelTemplateType;
    importer?: ImporterRequisites;
    labels: LabelData[];
    count: number;
}
