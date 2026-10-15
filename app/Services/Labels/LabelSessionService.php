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

    public function createFromUpload(UploadedFile $file, string $guestToken, string $category): LabelSession
    {
        LabelSession::where('guest_token', $guestToken)->delete();

        $path = $file->store('uploads');

        $session = LabelSession::create([
            'guest_token' => $guestToken,
            'category' => $category,
            'original_filename' => $file->getClientOriginalName(),
            'stored_file_path' => $path,
            'status' => 'uploaded',
        ]);

        return $session;
    }

    public function findByToken(string $guestToken, string $sessionId): ?LabelSession
    {
        return LabelSession::where('guest_token', $guestToken)
            ->where('id', $sessionId)
            ->first();
    }

    public function parseAndValidate(LabelSession $session, string $templateId = 'foho_default'): LabelSession
    {
        $parsed = $this->excelParsingService->parse(
            Storage::path($session->stored_file_path)
        );

        $validated = $this->validationService->validate($parsed, $templateId, $session->category);

        $session->update([
            'parsed_data' => $parsed,
            'validation_results' => $validated,
            'status' => 'audited',
        ]);

        $session = $session->fresh();

        return $this->autoAssignSingleTemplate($session);
    }

    public function autoAssignSingleTemplate(LabelSession $session): LabelSession
    {
        $templates = $this->templatesForCategory($session->category);

        if (count($templates) === 1 && $session->template_type === null) {
            $session->update([
                'template_id' => 'foho_default',
                'template_type' => $templates[0],
            ]);

            return $session->fresh();
        }

        return $session;
    }

    public function changeCategory(LabelSession $session, string $category): LabelSession
    {
        $session->update([
            'category' => $category,
            'parsed_data' => null,
            'validation_results' => null,
            'template_id' => null,
            'template_type' => null,
            'status' => 'uploaded',
        ]);

        return $session->fresh();
    }

    /**
     * @return array<int, string>
     */
    public function templatesForCategory(?string $category): array
    {
        if ($category === null || $category === '') {
            return [];
        }

        return config("labels.categories.{$category}.templates", []) ?: [];
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

    public static function purgeStaleSessions(int $hours = 48): int
    {
        return LabelSession::where('created_at', '<', now()->subHours($hours))
            ->delete();
    }
}
