<?php

namespace App\Services\Labels;

use App\Models\LabelSession;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LabelSessionService
{
    public function __construct(
        private ExcelParsingService $excelParsingService,
        private ValidationService $validationService,
        private PdfGenerationService $pdfGenerationService,
    ) {}

    public function createFromUpload(UploadedFile $file): LabelSession
    {
        $path = $file->store('uploads');

        $session = LabelSession::create([
            'original_filename' => $file->getClientOriginalName(),
            'stored_file_path' => $path,
            'status' => 'uploaded',
        ]);

        return $session;
    }

    public function parseAndValidate(LabelSession $session, string $templateId = 'foho_default'): LabelSession
    {
        $parsed = $this->excelParsingService->parse(
            Storage::path($session->stored_file_path)
        );

        $validated = $this->validationService->validate($parsed, $templateId);

        $session->update([
            'parsed_data' => $parsed,
            'validation_results' => $validated,
            'status' => 'audited',
        ]);

        return $session->fresh();
    }

    public function selectTemplate(LabelSession $session, string $templateId): LabelSession
    {
        $session->update([
            'template_id' => $templateId,
            'status' => 'template_selected',
        ]);

        return $session->fresh();
    }

    public function generate(LabelSession $session, string $format = 'pdf'): LabelSession
    {
        $rows = $session->validation_results;
        $templateId = $session->template_id ?? 'foho_default';

        $outputPath = $this->pdfGenerationService->saveMultiple(
            $rows,
            $templateId,
            $session->id,
            $format
        );

        $session->update([
            'output_path' => $outputPath,
            'output_format' => $format,
            'status' => 'generated',
        ]);

        return $session->fresh();
    }

    public function getPreviewRow(LabelSession $session): ?array
    {
        $rows = $session->validation_results;

        return $rows[0] ?? null;
    }
}
