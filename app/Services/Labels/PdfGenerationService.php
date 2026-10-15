<?php

namespace App\Services\Labels;

use App\Models\LabelTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class PdfGenerationService
{
    public function __construct(
        private BarcodeService $barcodeService,
        private TemplateService $templateService,
    ) {}

    private function getLayoutConfig(?array $importer = null): array
    {
        $template = LabelTemplate::where('is_active', true)->first();

        return [
            'width_px' => $template?->default_width_px ?? 469,
            'height_px' => $template?->default_height_px ?? 634,
            'importer_name' => $importer['name'] ?? '',
            'importer_address' => $importer['address'] ?? '',
            'importer_phone' => $importer['phone'] ?? '',
            'manufacturer_name' => $template?->manufacturer_name ?? '',
            'canvas_elements' => $template?->canvas_elements,
        ];
    }

    public function generateSingle(array $row, string $templateId, ?array $importer = null): string
    {
        $layout = $this->getLayoutConfig($importer);

        $barcodeDataUri = null;

        if (! empty($row['data']['barcode'])) {
            $barcodeDataUri = $this->barcodeService->generateEan13DataUri($row['data']['barcode']);
        }

        $html = view('labels.single', [
            'row' => $row,
            'layout' => $layout,
            'template' => $this->templateService->getTemplate($templateId),
            'brand' => $this->templateService->getBrandConfig(),
            'static' => $this->templateService->getStaticContent($templateId),
            'barcode' => $barcodeDataUri,
        ])->render();

        $pdf = Pdf::loadHtml($html);
        $pdf->setPaper([0, 0, $layout['width_px'], $layout['height_px']], 'portrait');

        return $pdf->output();
    }

    public function generateMultiple(array $rows, string $templateId, ?array $importer = null): string
    {
        $layout = $this->getLayoutConfig($importer);
        $brand = $this->templateService->getBrandConfig();
        $static = $this->templateService->getStaticContent($templateId);

        $barcodes = [];
        foreach ($rows as $index => $row) {
            if (! empty($row['data']['barcode'])) {
                $barcodes[$index] = $this->barcodeService->generateEan13DataUri($row['data']['barcode']);
            }
        }

        $html = view('labels.multiple', [
            'rows' => $rows,
            'layout' => $layout,
            'template' => $this->templateService->getTemplate($templateId),
            'brand' => $brand,
            'static' => $static,
            'barcodes' => $barcodes,
        ])->render();

        $pdf = Pdf::loadHtml($html);
        $pdf->setPaper([0, 0, $layout['width_px'], $layout['height_px']], 'portrait');

        return $pdf->output();
    }

    public function saveMultiple(
        array $rows,
        string $templateId,
        string $sessionId,
        string $format = 'pdf',
        ?array $importer = null
    ): string {
        $outputDir = "labels/{$sessionId}";
        Storage::makeDirectory($outputDir);

        if ($format === 'zip') {
            $zip = new \ZipArchive;
            $zipPath = Storage::path("{$outputDir}/labels.zip");
            if ($zip->open($zipPath, \ZipArchive::CREATE) !== true) {
                throw new \RuntimeException('Не удалось создать ZIP-архив');
            }

            foreach ($rows as $index => $row) {
                $pdfContent = $this->generateSingle($row, $templateId, $importer);
                $filename = "label_{$row['row']}.pdf";
                $zip->addFromString($filename, $pdfContent);
            }
            $zip->close();

            return "{$outputDir}/labels.zip";
        }

        $pdfContent = $this->generateMultiple($rows, $templateId, $importer);
        $pdfPath = "{$outputDir}/labels.pdf";
        Storage::put($pdfPath, $pdfContent);

        return $pdfPath;
    }
}
