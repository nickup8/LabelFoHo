export type LabelTemplateType = 'napkin' | 'mat' | 'tag';

export interface LabelTemplate {
    id: number;
    title: string;
    importer_name: string;
    importer_address: string;
    importer_phone: string;
    manufacturer_name: string;
    default_width_px: number;
    default_height_px: number;
    is_active: boolean;
    template_type: LabelTemplateType;
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
    composition: string;
    importer_name: string;
    importer_address: string;
    importer_phone: string;
    manufacturer: string;
    factory_name: string;
    manufacture_date: string | null;
    barcode: string;
    barcode_data_uri: string | null;
    recycle_code: string;
    recycle_label: string;
    certification_marks: string[];
    regulation_text: string;
}

/** Ответ эндпоинта /labels/download */
export interface LabelsDownloadResponse {
    session_id: string;
    template_id: string;
    template_type: LabelTemplateType;
    labels: LabelData[];
    count: number;
}
