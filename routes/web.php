<?php

use App\Http\Controllers\LabelController;
use App\Http\Controllers\TemplateController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LabelController::class, 'index'])->name('index');
Route::get('/label', function () {
    return inertia('Label');
})->name('label');

Route::prefix('labels')->name('labels.')->group(function () {
    Route::get('/', [LabelController::class, 'wizard'])->name('index');
    Route::post('/upload', [LabelController::class, 'upload'])->name('upload');
    Route::post('/audit', [LabelController::class, 'confirmAudit'])->name('audit');
    Route::post('/select-template', [LabelController::class, 'selectTemplate'])->name('select-template');
    Route::post('/generate', [LabelController::class, 'generate'])->name('generate');
    Route::get('/download', [LabelController::class, 'download'])->name('download');

    Route::get('/settings', [TemplateController::class, 'index'])->name('settings.index');
    Route::post('/settings', [TemplateController::class, 'update'])->name('settings.update');
});

require __DIR__.'/settings.php';
