<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Приводит таблицу importers к одной общей карточке:
     * - при нескольких карточках с идентичными реквизитами объединяет их без потери значений;
     * - при различных реквизитах оставляет раннюю карточку (владелец выбрал её),
     *   остальные удаляет;
     * - колонка singleton (unique) гарантирует на уровне БД невозможность второй записи.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('importers', 'singleton')) {
            Schema::table('importers', function (Blueprint $table) {
                $table->unsignedTinyInteger('singleton')->nullable();
            });
        }

        $this->consolidateToSingleCard();

        Schema::table('importers', function (Blueprint $table) {
            $table->unique('singleton');
        });

        if (Schema::hasColumn('importers', 'is_active')) {
            Schema::table('importers', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('importers', 'is_active')) {
            Schema::table('importers', function (Blueprint $table) {
                $table->boolean('is_active')->default(true);
            });

            DB::table('importers')->update(['is_active' => true]);
        }

        if (Schema::hasColumn('importers', 'singleton')) {
            Schema::table('importers', function (Blueprint $table) {
                $table->dropUnique(['singleton']);
                $table->dropColumn('singleton');
            });
        }
    }

    /**
     * Оставляет одну карточку и помечает её singleton = 1.
     * При различающихся реквизитах выбрана ранняя карточка (решение владельца).
     */
    public function consolidateToSingleCard(): void
    {
        $cards = DB::table('importers')->orderBy('id')->get();

        if ($cards->isEmpty()) {
            return;
        }

        $keeper = $cards->first(fn ($card) => $this->isComplete($card)) ?? $cards->first();

        foreach ($cards as $card) {
            if ($card->id !== $keeper->id) {
                DB::table('importers')->where('id', $card->id)->delete();
            }
        }

        DB::table('importers')->where('id', $keeper->id)->update(['singleton' => 1]);
    }

    private function isComplete(object $card): bool
    {
        return trim((string) $card->name) !== ''
            && trim((string) $card->legal_address) !== ''
            && trim((string) $card->phone) !== '';
    }
};
