<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('label_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('importer_name');
            $table->text('importer_address');
            $table->string('importer_phone');
            $table->string('manufacturer_name');
            $table->integer('default_width_px')->default(469);
            $table->integer('default_height_px')->default(634);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('label_templates');
    }
};
