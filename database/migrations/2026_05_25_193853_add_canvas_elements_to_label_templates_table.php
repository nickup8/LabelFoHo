<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('label_templates', function (Blueprint $table) {
            $table->json('canvas_elements')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('label_templates', function (Blueprint $table) {
            $table->dropColumn('canvas_elements');
        });
    }
};
