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

    public function handle(UploadedFile $file): LabelSession
    {
        $session = $this->sessionService->createFromUpload($file);

        return $this->sessionService->parseAndValidate($session);
    }
}
