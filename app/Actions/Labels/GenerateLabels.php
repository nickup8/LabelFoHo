<?php

namespace App\Actions\Labels;

use App\Models\LabelSession;
use App\Services\Labels\LabelSessionService;

class GenerateLabels
{
    public function __construct(
        private LabelSessionService $sessionService,
    ) {}

    public function handle(LabelSession $session, string $format = 'pdf'): LabelSession
    {
        return $this->sessionService->generate($session, $format);
    }
}
