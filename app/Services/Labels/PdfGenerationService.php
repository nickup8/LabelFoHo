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

    private function getLayoutConfig(): array
    {
        $template = LabelTemplate::where('is_active', true)->first();

        return [
            'width_px' => $template?->default_width_px ?? 469,
            'height_px' => $template?->default_height_px ?? 634,
            'importer_name' => $template?->importer_name ?? 'ИП Климин П. А.',
            'importer_address' => $template?->importer_address ?? '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
            'importer_phone' => $template?->importer_phone ?? '+7 (995) 771-27-92',
            'manufacturer_name' => $template?->manufacturer_name ?? '',
            'canvas_elements' => $template?->canvas_elements,
        ];
    }

    public function generateSingle(array $row, string $templateId): string
    {
        $layout = $this->getLayoutConfig();

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

    public function generateMultiple(array $rows, string $templateId): string
    {
        $layout = $this->getLayoutConfig();
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
        string $format = 'pdf'
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
                $pdfContent = $this->generateSingle($row, $templateId);
                $filename = "label_{$row['row']}.pdf";
                $zip->addFromString($filename, $pdfContent);
            }
            $zip->close();

            return "{$outputDir}/labels.zip";
        }

        $pdfContent = $this->generateMultiple($rows, $templateId);
        $pdfPath = "{$outputDir}/labels.pdf";
        Storage::put($pdfPath, $pdfContent);

        return $pdfPath;
    }
}
