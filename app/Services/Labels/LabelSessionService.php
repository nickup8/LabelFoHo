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

    public function selectTemplate(LabelSession $session, string $templateType): LabelSession
    {
        $session->update([
            'template_id' => 'foho_default',
            'template_type' => $templateType,
            'status' => 'template_selected',
        ]);

        return $session->fresh();
    }

    public function generate(LabelSession $session): LabelSession
    {
        $session->update([
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
