<?php

namespace App\Http\Controllers;

use App\Models\Importer;
use App\Models\LabelTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TemplateController extends Controller
{
    public function index()
    {
        $template = LabelTemplate::where('is_active', true)->first();

        if (! $template) {
            $template = LabelTemplate::create([
                'title' => 'FoHo Стандарт',
                'manufacturer_name' => '',
                'default_width_px' => 469,
                'default_height_px' => 634,
                'is_active' => true,
            ]);
        }

        $importer = Importer::current();

        return Inertia::render('Labels/Settings', [
            'template' => $template,
            'importer' => $importer ? [
                'name' => $importer->name,
                'legal_address' => $importer->legal_address,
                'phone' => $importer->phone,
            ] : null,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'manufacturer_name' => 'required|string|max:255',
            'default_width_px' => 'required|integer|min:200|max:2000',
            'default_height_px' => 'required|integer|min:200|max:2000',
            'title' => 'nullable|string|max:255',
            'canvas_elements' => 'nullable|json',
        ]);

        $template = LabelTemplate::where('is_active', true)->first();

        if (! $template) {
            $validated['is_active'] = true;
            LabelTemplate::create($validated);
        } else {
            $template->update($validated);
        }

        return redirect()->route('labels.settings.index')
            ->with('success', 'Настройки шаблона сохранены');
    }
}
