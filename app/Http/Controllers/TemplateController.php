<?php

namespace App\Http\Controllers;

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
                'importer_name' => 'ИП Климин П. А.',
                'importer_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
                'importer_phone' => '+7 (995) 771-27-92',
                'default_width_px' => 469,
                'default_height_px' => 634,
                'is_active' => true,
            ]);
        }

        return Inertia::render('Labels/Settings', [
            'template' => $template,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'importer_name' => 'required|string|max:255',
            'importer_address' => 'required|string|max:1000',
            'importer_phone' => 'required|string|max:50',
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
