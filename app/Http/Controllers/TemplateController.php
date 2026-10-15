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
                'title' => 'FoHo Стандарт',
                'manufacturer_name' => '',
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
