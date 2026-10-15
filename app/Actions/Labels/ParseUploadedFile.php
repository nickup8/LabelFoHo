<?php

namespace App\Actions\Labels;

use App\Models\LabelSession;
use App\Services\Labels\LabelSessionService;
use Illuminate\Http\UploadedFile;

class ParseUploadedFile
{
    public function __construct(
        private LabelSessionService $sessionService,
    ) {}

    public function handle(UploadedFile $file, string $guestToken, string $category): LabelSession
    {
        $session = $this->sessionService->createFromUpload($file, $guestToken, $category);

        return $this->sessionService->parseAndValidate($session);
    }
}
