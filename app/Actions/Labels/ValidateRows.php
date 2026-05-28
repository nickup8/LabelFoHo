<?php

namespace App\Actions\Labels;

use App\Models\LabelSession;
use App\Services\Labels\LabelSessionService;

class ValidateRows
{
    public function __construct(
        private LabelSessionService $sessionService,
    ) {}

    public function handle(LabelSession $session, string $templateId = 'foho_default'): LabelSession
    {
        return $this->sessionService->parseAndValidate($session, $templateId);
    }
}
