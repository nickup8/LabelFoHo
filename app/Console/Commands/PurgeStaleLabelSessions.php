<?php

namespace App\Console\Commands;

use App\Services\Labels\LabelSessionService;
use Illuminate\Console\Command;

class PurgeStaleLabelSessions extends Command
{
    protected $signature = 'labels:purge-sessions {--hours=48 : Удалить сессии старше N часов}';

    protected $description = 'Удаляет устаревшие анонимные сессии этикеток';

    public function handle(): int
    {
        $hours = (int) $this->option('hours');

        $deleted = LabelSessionService::purgeStaleSessions($hours);

        $this->info("Удалено {$deleted} сессий старше {$hours} часов.");

        return Command::SUCCESS;
    }
}
