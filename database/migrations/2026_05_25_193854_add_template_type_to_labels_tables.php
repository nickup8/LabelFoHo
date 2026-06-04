<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('label_templates', function (Blueprint $table) {
            $table->string('template_type')->default('napkin')->after('is_active');
        });

        Schema::table('label_sessions', function (Blueprint $table) {
            $table->string('template_type')->default('napkin')->after('template_id');
        });
    }

    public function down(): void
    {
        Schema::table('label_templates', function (Blueprint $table) {
            $table->dropColumn('template_type');
        });

        Schema::table('label_sessions', function (Blueprint $table) {
            $table->dropColumn('template_type');
        });
    }
};
