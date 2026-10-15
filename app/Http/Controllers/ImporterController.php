<?php

namespace App\Http\Controllers;

use App\Http\Requests\Importers\UpdateImporterRequest;
use App\Models\Importer;
use Inertia\Inertia;
use Inertia\Response;

class ImporterController extends Controller
{
    public function index(): Response
    {
        $card = Importer::current();

        return Inertia::render('Importers/Index', [
            'importer' => $card ? [
                'name' => $card->name,
                'legal_address' => $card->legal_address,
                'phone' => $card->phone,
            ] : null,
        ]);
    }

    public function update(UpdateImporterRequest $request)
    {
        Importer::saveCard([
            'name' => $request->string('name')->toString(),
            'legal_address' => $request->string('legal_address')->toString(),
            'phone' => $request->string('phone')->toString(),
        ]);

        return redirect()
            ->route('importers.index')
            ->with('success', 'Данные импортёра сохранены');
    }
}
