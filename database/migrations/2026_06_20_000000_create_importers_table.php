<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('importers', function (Blueprint $table) {
            $table->id();
            $table->text('name');
            $table->text('legal_address');
            $table->string('phone', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $this->transferExistingRequisites();
    }

    public function down(): void
    {
        Schema::dropIfExists('importers');
    }

    /**
     * Переносит реквизиты, ранее хранившиеся в настройках шаблона
     * (label_templates.importer_*), в справочник импортёров без потери данных.
     */
    private function transferExistingRequisites(): void
    {
        if (! Schema::hasTable('label_templates') || ! Schema::hasColumn('label_templates', 'importer_name')) {
            return;
        }

        $templates = DB::table('label_templates')
            ->get(['importer_name', 'importer_address', 'importer_phone']);

        foreach ($templates as $template) {
            $name = trim((string) ($template->importer_name ?? ''));
            $address = trim((string) ($template->importer_address ?? ''));
            $phone = trim((string) ($template->importer_phone ?? ''));

            if ($name === '' || $address === '' || $phone === '') {
                continue;
            }

            $exists = DB::table('importers')
                ->where('name', $name)
                ->where('legal_address', $address)
                ->where('phone', $phone)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('importers')->insert([
                'name' => $name,
                'legal_address' => $address,
                'phone' => $phone,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};
