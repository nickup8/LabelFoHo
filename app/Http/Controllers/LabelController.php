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
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

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
            $request->input('template_type'),
        );

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 4,
        ]);
    }

    public function generate(GenerateLabelsRequest $request, GenerateLabels $action)
    {
        $session = LabelSession::findOrFail($request->input('session_id'));

        $session = $action->handle($session);

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 5,
        ]);
    }

    public function download()
    {
        try {
            $sessionId = request()->query('session_id');

            if (! $sessionId) {
                return response()->json([
                    'error' => 'Параметр session_id обязателен.',
                ], 422);
            }

            $session = LabelSession::findOrFail($sessionId);
            $rows = $session->validation_results ?? [];

            $brandConfig = $this->templateService->getBrandConfig();
            $templateId = $session->template_id ?? 'foho_default';
            $static = $this->templateService->getStaticContent($templateId);

            $labels = [];

            foreach ($rows as $row) {
                $data = $row['data'] ?? [];
                $recycling = $data['recycling'] ?? null;
                $barcode = $data['barcode'] ?? '';

                $labels[] = [
                    'row' => $row['row'] ?? null,
                    'title' => $data['product_name'] ?? 'Набор салфеток для сервировки стола — 4 шт.',
                    'brand' => $brandConfig['trademark'] ?? 'FoHo',
                    'sku' => $data['supplier_article'] ?? '',
                    'size' => $data['size'] ?? '',
                    'is_circular' => $data['is_circular'] ?? false,
                    'composition' => $data['composition'] ?? '',
                    'importer_name' => $static['importer'] ?? 'ИП Климин П. А.',
                    'importer_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
                    'importer_phone' => '+7 (995) 771-27-92',
                    'manufacturer' => $data['factory_name'] ?? $data['manufacturer'] ?? '',
                    'factory_name' => $data['factory_name'] ?? '',
                    'manufacture_date' => $data['manufacture_date'] ?? null,
                    'barcode' => $barcode,
                    'barcode_data_uri' => $barcode
                        ? $this->barcodeService->generateEan13DataUri($barcode)
                        : null,
                    'recycle_code' => $recycling['code'] ?? '03',
                    'recycle_label' => $recycling['label'] ?? 'PVC',
                    'certification_marks' => $static['certification_marks'] ?? ['EAC'],
                    'regulation_text' => 'Соответствует требованиям ТР ТС 017/2011 «О безопасности продукции легкой промышленности»',
                ];
            }

            return response()->json([
                'session_id' => $session->id,
                'template_id' => $templateId,
                'template_type' => $session->template_type ?? 'napkin',
                'labels' => $labels,
                'count' => count($labels),
            ]);

        } catch (\Throwable $e) {
            Log::error('[Labels] Ошибка получения данных для PDF: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Не удалось загрузить данные для генерации PDF.',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

}
