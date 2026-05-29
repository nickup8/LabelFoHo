import { Head } from '@inertiajs/react';
import UploadStep from '@/pages/Labels/Steps/UploadStep';
import AuditStep from '@/components/Labels/Steps/AuditStep';
import TemplateStep from '@/components/Labels/Steps/TemplateStep';
import PreviewStep from '@/components/Labels/Steps/PreviewStep';
import ExportStep from '@/components/Labels/Steps/ExportStep';

interface Session {
    id: string;
    status: string;
    original_filename: string;
    parsed_data: Record<string, unknown>;
    validation_results: Array<{
        row: number;
        data: Record<string, string>;
        errors: string[];
        is_valid: boolean;
    }>;
    template_id: string | null;
    output_format: string | null;
    output_path: string | null;
}

interface Template {
    name: string;
    description: string;
    orientation: string;
    page_width_mm: number;
    page_height_mm: number;
    columns_mapping: Record<string, string>;
    sections: Record<string, { y_mm: number; height_mm: number }>;
    fields: Record<string, Record<string, unknown>>;
    static: Record<string, unknown>;
}

interface PreviewData {
    row: number;
    data: Record<string, string>;
    barcode_data_uri: string | null;
    brand: { name: string; trademark: string; importer: string };
    static: {
        trademark: string;
        importer: string;
        certification_marks: string[];
        manufacturer_default: string;
    };
}

interface Props {
    session: Session | null;
    step: number;
    templates: Record<string, Template>;
    previewData: PreviewData | null;
}

export default function LabelsWizard({
    session,
    step,
    templates,
    previewData,
}: Props) {
    return (
        <>
            <Head title="Генерация бирок FoHo" />

            <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                {step === 1 && <UploadStep />}
                {step === 2 && session && <AuditStep session={session} />}
                {step === 3 && session && (
                    <TemplateStep session={session} templates={templates} />
                )}
                {step === 4 && session && previewData && (
                    <PreviewStep
                        session={session}
                        templates={templates}
                        previewData={previewData}
                    />
                )}
                {step === 5 && session && <ExportStep sessionId={session.id} />}
            </div>
        </>
    );
}
