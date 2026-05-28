<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('label_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('original_filename')->nullable();
            $table->string('stored_file_path')->nullable();
            $table->json('parsed_data')->nullable();
            $table->json('validation_results')->nullable();
            $table->string('template_id')->nullable();
            $table->string('status')->default('uploaded');
            $table->string('output_format')->nullable();
            $table->string('output_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('label_sessions');
    }
};
