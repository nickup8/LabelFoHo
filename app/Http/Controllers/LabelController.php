<?php

namespace App\Http\Controllers;

use App\Actions\Labels\GenerateLabels;
use App\Actions\Labels\ParseUploadedFile;
use App\Http\Requests\Labels\GenerateLabelsRequest;
use App\Http\Requests\Labels\SelectTemplateRequest;
use App\Http\Requests\Labels\UploadFileRequest;
use App\Models\Importer;
use App\Services\Labels\BarcodeService;
use App\Services\Labels\LabelSessionService;
use App\Services\Labels\TemplateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class LabelController extends Controller
{
    public function __construct(
        private LabelSessionService $sessionService,
        private TemplateService $templateService,
        private BarcodeService $barcodeService,
    ) {}

    private function getGuestToken(): string
    {
        return request()->session()->getId();
    }

    public function index()
    {
        return Inertia::render('Labels/Index', [
            'session' => null,
            'step' => 1,
            'templates' => $this->templateService->getAllTemplates(),
            'categories' => config('labels.categories', []),
            'importer' => $this->getImporterCard(),
        ]);
    }

    public function wizard()
    {
        $sessionId = request()->query('session');
        $forcedStep = (int) request()->query('step', 0);

        $session = $sessionId
            ? $this->sessionService->findByToken($this->getGuestToken(), $sessionId)
            : null;

        if (! $session) {
            return Inertia::render('Labels/Index', [
                'session' => null,
                'step' => 1,
                'templates' => $this->templateService->getAllTemplates(),
                'categories' => config('labels.categories', []),
                'importer' => $this->getImporterCard(),
            ]);
        }

        $step = $forcedStep > 0
            ? $forcedStep
            : match ($session->status) {
                'audited' => 2,
                'template_selected' => 3,
                'generated' => 4,
                default => 2,
            };

        if ($session->status === 'uploaded' && empty($session->validation_results)) {
            $step = 1;
        }

        if ($step === 3 && count($this->sessionService->templatesForCategory($session->category)) === 1) {
            $session = $this->sessionService->autoAssignSingleTemplate($session);
            $step = 4;
        }

        return Inertia::render('Labels/Index', [
            'session' => $session,
            'step' => $step,
            'templates' => $this->templateService->getAllTemplates(),
            'categories' => config('labels.categories', []),
            'importer' => $this->getImporterCard(),
        ]);
    }

    /**
     * @return array<string, string>|null
     */
    private function getImporterCard(): ?array
    {
        $card = Importer::current();

        if (! $card) {
            return null;
        }

        return [
            'name' => $card->name,
            'legal_address' => $card->legal_address,
            'phone' => $card->phone,
            'is_complete' => $card->isComplete(),
        ];
    }

    public function upload(UploadFileRequest $request, ParseUploadedFile $action)
    {
        $session = $action->handle(
            $request->file('file'),
            $this->getGuestToken(),
            $request->input('category'),
        );

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 2,
        ]);
    }

    public function changeCategory(Request $request)
    {
        $categories = implode(',', array_keys(config('labels.categories', [])));

        $validated = $request->validate([
            'session_id' => 'required|string|exists:label_sessions,id',
            'category' => "required|string|in:{$categories}",
        ], [
            'session_id.required' => 'Сессия не указана',
            'category.required' => 'Необходимо выбрать категорию',
            'category.in' => 'Недопустимая категория',
        ]);

        $session = $this->sessionService->findByToken(
            $this->getGuestToken(),
            $validated['session_id']
        );

        if (! $session) {
            abort(404);
        }

        if ($session->category !== $validated['category']) {
            $session = $this->sessionService->changeCategory($session, $validated['category']);
        }

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 1,
        ]);
    }

    public function confirmAudit()
    {
        $guestToken = $this->getGuestToken();
        $session = $this->sessionService->findByToken(
            $guestToken,
            request()->input('session_id')
        );

        if (! $session) {
            abort(404);
        }

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
        $session = $this->sessionService->findByToken(
            $this->getGuestToken(),
            $request->input('session_id')
        );

        if (! $session) {
            abort(404);
        }

        $allowedTemplates = $this->sessionService->templatesForCategory($session->category);

        if ($session->category !== null && ! in_array($request->input('template_type'), $allowedTemplates, true)) {
            return back()->withErrors([
                'template_type' => 'Шаблон не соответствует выбранной категории',
            ]);
        }

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
        $session = $this->sessionService->findByToken(
            $this->getGuestToken(),
            $request->input('session_id')
        );

        if (! $session) {
            abort(404);
        }

        $session = $action->handle($session);

        return redirect()->route('labels.index', [
            'session' => $session->id,
            'step' => 4,
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

            $session = $this->sessionService->findByToken(
                $this->getGuestToken(),
                $sessionId
            );

            if (! $session) {
                return response()->json([
                    'error' => 'Сессия не найдена.',
                ], 404);
            }

            $importer = Importer::current();

            if (! $importer || ! $importer->isComplete()) {
                return response()->json([
                    'error' => 'Карточка импортёра не заполнена. Укажите название организации, юридический адрес и телефон, чтобы сформировать этикетки.',
                    'error_code' => 'importer_card_incomplete',
                    'importer_card_url' => route('importers.index'),
                ], 422);
            }

            $rows = $session->validation_results ?? [];

            $manufacturerErrors = $this->findEmptyManufacturerErrors($rows);

            if ($manufacturerErrors !== []) {
                return response()->json([
                    'error' => $this->formatRowErrors($manufacturerErrors),
                    'details' => $manufacturerErrors,
                ], 422);
            }

            if (request()->has('limit')) {
                $first = reset($rows);
                $rows = $first !== false ? [$first] : [];
            }

            $brandConfig = $this->templateService->getBrandConfig();
            $templateId = $session->template_id ?? 'foho_default';
            $templateType = $session->template_type ?? ($session->category === 'mats' ? 'mat' : 'napkin');
            $static = $this->templateService->getStaticContent($templateId);

            $labels = [];

            foreach ($rows as $row) {
                $data = $row['data'] ?? [];
                $recycling = $data['recycling'] ?? null;
                $barcode = $data['barcode'] ?? '';

                $labels[] = [
                    'row' => $row['row'] ?? null,
                    'title' => $data['product_name'] ?? ($templateType === 'mat' ? '' : 'Набор салфеток для сервировки стола — 4 шт.'),
                    'brand' => $brandConfig['trademark'] ?? 'FoHo',
                    'sku' => $data['supplier_article'] ?? '',
                    'size' => $data['size'] ?? '',
                    'is_circular' => $data['is_circular'] ?? false,
                    'is_kit' => $data['is_kit'] ?? false,
                    'composition' => $data['composition'] ?? '',
                    'composition_raw' => $data['composition_raw'] ?? ($data['composition'] ?? ''),
                    'importer_name' => $importer->name,
                    'importer_address' => $importer->legal_address,
                    'importer_phone' => $importer->phone,
                    'manufacturer' => $data['factory_name'] ?? $data['manufacturer'] ?? '',
                    'factory_name' => $data['factory_name'] ?? '',
                    'manufacture_date' => $data['manufacture_date'] ?? null,
                    'barcode' => $barcode,
                    'barcode_data_uri' => $barcode
                        ? $this->barcodeService->generateEan13DataUri($barcode)
                        : null,
                    'recycle_code' => $recycling['code'] ?? null,
                    'recycle_label' => $recycling['label'] ?? null,
                    'certification_marks' => $static['certification_marks'] ?? ['EAC'],
                    'regulation_text' => 'Соответствует требованиям ТР ТС 017/2011 «О безопасности продукции легкой промышленности»',
                ];
            }

            return response()->json([
                'session_id' => $session->id,
                'template_id' => $templateId,
                'template_type' => $templateType,
                'importer' => [
                    'id' => $importer->id,
                    'name' => $importer->name,
                    'address' => $importer->legal_address,
                    'phone' => $importer->phone,
                ],
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

    /**
     * Пустой (или состоящий только из пробелов) изготовитель из столбца
     * «Название фабрики» — адресная ошибка, блокирующая экспорт.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, string>
     */
    private function findEmptyManufacturerErrors(array $rows): array
    {
        $errors = [];

        foreach ($rows as $row) {
            $data = $row['data'] ?? [];
            $factoryName = trim((string) ($data['factory_name'] ?? ''));

            if ($factoryName === '') {
                $rowNumber = $row['row'] ?? '?';
                $errors[] = "Строка {$rowNumber}: пустое значение «Название фабрики» — укажите изготовителя";
            }
        }

        return $errors;
    }

    /**
     * @param  array<int, string>  $errors
     */
    private function formatRowErrors(array $errors): string
    {
        $visible = array_slice($errors, 0, 5);
        $message = implode('; ', $visible);

        if (count($errors) > count($visible)) {
            $message .= '; и ещё '.(count($errors) - count($visible));
        }

        return $message;
    }
}
