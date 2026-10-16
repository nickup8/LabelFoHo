import { Head } from '@inertiajs/react';
import { useState } from 'react';
import FohoShell from '@/components/Labels/FohoShell';
import AuditStep from '@/components/Labels/Steps/AuditStep';
import ExportStep from '@/components/Labels/Steps/ExportStep';
import TemplateStep from '@/components/Labels/Steps/TemplateStep';
import {
    templateCountFor,
    wizardSteps,
} from '@/components/Labels/WizardStepper';
import type {WizardCategories} from '@/components/Labels/WizardStepper';
import UploadStep from '@/pages/Labels/Steps/UploadStep';
import {
    readWizardCategory,
    writeWizardCategory,
} from '@/pages/Labels/wizardCategory';

interface Session {
    id: string;
    status: string;
    category: string | null;
    original_filename: string;
    parsed_data: Record<string, unknown>;
    validation_results: Array<{
        row: number;
        data: Record<string, string>;
        errors: string[];
        is_valid: boolean;
    }>;
    template_id: string | null;
    template_type: string | null;
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

interface ImporterCard {
    name: string;
    legal_address: string;
    phone: string;
    is_complete: boolean;
}

interface Props {
    session: Session | null;
    step: number;
    templates: Record<string, Template>;
    categories: WizardCategories;
    importer: ImporterCard | null;
}

export default function LabelsWizard({
    session,
    step,
    categories,
    importer,
}: Props) {
    const [localStep, setLocalStep] = useState<number | null>(null);
    const [category, setCategoryState] = useState<string | null>(
        readWizardCategory,
    );

    const setCategory = (value: string) => {
        writeWizardCategory(value);
        setCategoryState(value);
    };

    const effectiveStep = localStep ?? step;
    const sessionTemplateCount = templateCountFor(
        categories,
        session?.category ?? null,
    );
    const currentCategory =
        effectiveStep === 1 ? category : (session?.category ?? null);
    const steps = wizardSteps(templateCountFor(categories, currentCategory));

    return (
        <>
            <Head title="Генерация бирок FoHo" />

            <FohoShell steps={steps} currentId={effectiveStep}>
                {effectiveStep === 1 && (
                    <UploadStep
                        categories={categories}
                        category={category}
                        onCategoryChange={setCategory}
                        session={session}
                    />
                )}
                {effectiveStep === 2 && session && (
                    <AuditStep
                        session={session as any}
                        importer={importer}
                        categories={categories}
                    />
                )}
                {effectiveStep === 3 && session && (
                    <TemplateStep session={session} categories={categories} />
                )}
                {effectiveStep === 4 && session && (
                    <ExportStep
                        sessionId={session.id}
                        templateCount={sessionTemplateCount}
                    />
                )}
            </FohoShell>
        </>
    );
}
