<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Убирает конкурирующие реквизиты импортёра из настроек шаблона:
     * данные предварительно перенесены в таблицу importers.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('label_templates', 'importer_name')) {
            return;
        }

        Schema::table('label_templates', function (Blueprint $table) {
            $table->dropColumn(['importer_name', 'importer_address', 'importer_phone']);
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('label_templates', 'importer_name')) {
            return;
        }

        Schema::table('label_templates', function (Blueprint $table) {
            $table->string('importer_name')->nullable()->after('title');
            $table->text('importer_address')->nullable()->after('importer_name');
            $table->string('importer_phone')->nullable()->after('importer_address');
        });

        $importer = DB::table('importers')->orderBy('id')->first();

        if ($importer) {
            DB::table('label_templates')->update([
                'importer_name' => $importer->name,
                'importer_address' => $importer->legal_address,
                'importer_phone' => $importer->phone,
            ]);
        }
    }
};
