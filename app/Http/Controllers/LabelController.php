<?php

namespace App\Http\Controllers;

use App\Actions\Labels\GenerateLabels;
use App\Actions\Labels\ParseUploadedFile;
use App\Http\Requests\Labels\GenerateLabelsRequest;
use App\Http\Requests\Labels\SelectTemplateRequest;
use App\Http\Requests\Labels\UploadFileRequest;
use App\Models\LabelSession;
use App\Services\Labels\BarcodeService;
use App\Services\Labels\LabelSessionService;
use App\Services\Labels\TemplateService;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LabelController extends Controller
{
    public function __construct(
        private LabelSessionService $sessionService,
        private TemplateService $templateService,
        private BarcodeService $barcodeService,
    ) {}

    public function index()
    {
        return Inertia::render('Labels/Index', [
            'session' => null,
            'step' => 1,
            'templates' => $this->templateService->getAllTemplates(),
        ]);
    }

    public function wizard()
    {
        $sessionId = request()->query('session');
        $forcedStep = (int) request()->query('step', 0);

        $session = $sessionId ? LabelSession::find($sessionId) : null;

        if (! $session) {
            return Inertia::render('Labels/Index', [
                'session' => null,
                'step' => 1,
                'templates' => $this->templateService->getAllTemplates(),
            ]);
        }

        $step = $forcedStep > 0
            ? $forcedStep
            : match ($session->status) {
                'audited' => 2,
                'template_selected' => 3,
                'generated' => 5,
                default => 2,
            };

        $previewData = null;
        if ($step === 4) {
            $rows = $session->validation_results ?? [];
            $firstRow = $rows[0] ?? null;

            if ($firstRow) {
                $barcode = $firstRow['data']['barcode'] ?? null;
                $barcodeDataUri = $barcode
                    ? $this->barcodeService->generateEan13DataUri($barcode)
                    : null;

                $templateId = $session->template_id ?? 'foho_default';

                $previewData = [
                    'row' => $firstRow['row'],
                    'data' => $firstRow['data'],
                    'barcode_data_uri' => $barcodeDataUri,
                    'brand' => $this->templateService->getBrandConfig(),
                    'static' => $this->templateService->getStaticContent($templateId),
                ];
            }
        }

        return Inertia::render('Labels/Index', [
            'session' => $session,
            'step' => $step,
            'templates' => $this->templateService->getAllTemplates(),
            'previewData' => $previewData,
        ]);
    }

    public function upload(UploadFileRequest $request, ParseUploadedFile $action)
    {
        $session = $action->handle($request->file('file'));

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 2,
        ]);
    }

    public function confirmAudit()
    {
        $session = LabelSession::findOrFail(request()->input('session_id'));

        if ($session->status === 'uploaded') {
            $session->update(['status' => 'audited']);
        }

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 3,
        ]);
    }

    public function selectTemplate(SelectTemplateRequest $request)
    {
        $session = LabelSession::findOrFail($request->input('session_id'));

        $session = $this->sessionService->selectTemplate(
            $session,
            $request->input('template_id')
        );

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 4,
        ]);
    }

    public function generate(GenerateLabelsRequest $request, GenerateLabels $action)
    {
        $session = LabelSession::findOrFail($request->input('session_id'));

        $session = $action->handle($session, $request->input('format'));

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 5,
        ]);
    }

    public function download(): BinaryFileResponse
    {
        $sessionId = request()->query('session_id');
        $format = request()->query('format', 'pdf');

        $session = LabelSession::findOrFail($sessionId);

        $expectedPath = "labels/{$session->id}/labels.{$format}";

        if (! Storage::exists($expectedPath)) {
            $action = app(GenerateLabels::class);
            $action->handle($session, $format);
        }

        $fullPath = Storage::path($expectedPath);

        if (! file_exists($fullPath)) {
            abort(404, 'Файл не найден');
        }

        $filename = "foho_labels_{$session->id}.{$format}";

        return response()->download($fullPath, $filename, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

}
