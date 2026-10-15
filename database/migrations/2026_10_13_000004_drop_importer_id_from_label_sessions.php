<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Сессии больше не привязаны к выбору импортёра:
     * приложение использует единственную общую карточку.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('label_sessions', 'importer_id')) {
            return;
        }

        Schema::table('label_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('importer_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('label_sessions', 'importer_id')) {
            return;
        }

        Schema::table('label_sessions', function (Blueprint $table) {
            $table->foreignId('importer_id')
                ->nullable()
                ->after('template_type')
                ->constrained('importers')
                ->nullOnDelete();
        });
    }
};
