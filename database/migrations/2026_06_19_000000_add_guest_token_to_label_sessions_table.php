<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('label_sessions', function (Blueprint $table) {
            $table->string('guest_token')->nullable()->after('id');
        });

        Schema::table('label_sessions', function (Blueprint $table) {
            $table->index('guest_token');
        });
    }

    public function down(): void
    {
        Schema::table('label_sessions', function (Blueprint $table) {
            $table->dropIndex(['guest_token']);
            $table->dropColumn('guest_token');
        });
    }
};
