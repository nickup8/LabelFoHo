<?php

namespace App\Services\Labels;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class ExcelParsingService
{
    private const MATERIAL_ALIASES = [
        'пвх' => 'ПВХ',
        'pvc' => 'ПВХ',
        'поливинилхлорид' => 'ПВХ',
        'поливинилхлоридный' => 'ПВХ',
        'пэт' => 'ПЭТ',
        'pet' => 'ПЭТ',
        'полиэстер' => 'ПЭТ',
        'полиэстерный' => 'ПЭТ',
        'полиэфир' => 'ПЭТ',
        'пэтф' => 'ПЭТ',
        'пп' => 'ПП',
        'pp' => 'ПП',
        'полипропилен' => 'ПП',
        'полипропиленовый' => 'ПП',
        'пэвд' => 'ПЭНП',
        'пэнд' => 'ПЭВП',
        'полиэтилен низкой плотности' => 'ПЭНП',
        'полиэтилен высокого давления' => 'ПЭНП',
        'пэвп' => 'ПЭВП',
        'полиэтилен низкого давления' => 'ПЭВП',
        'па' => 'ПА',
        'pa' => 'ПА',
        'полиамид' => 'ПА',
        'полиамидный' => 'ПА',
        'джут' => 'Джут',
        'джутовый' => 'Джут',
        'jute' => 'Джут',
        'pu кожа' => 'PU кожа',
        'пу кожа' => 'PU кожа',
        'pu' => 'PU кожа',
        'полиуретан' => 'PU кожа',
        'экокожа' => 'PU кожа',
    ];

    private const RECYCLING_CODES = [
        'ПВХ' => ['code' => '03', 'label' => 'PVC', 'full' => '03 PVC'],
        'ПЭТ' => ['code' => '01', 'label' => 'PET', 'full' => '01 PET'],
        'ПП'   => ['code' => '05', 'label' => 'PP',  'full' => '05 PP'],
        'ПЭНП' => ['code' => '04', 'label' => 'PE-LD', 'full' => '04 PE-LD'],
        'ПЭВП' => ['code' => '02', 'label' => 'PE-HD', 'full' => '02 PE-HD'],
        'ПА'   => ['code' => '07', 'label' => 'PA',   'full' => '07 PA'],
        'Джут' => ['code' => '60', 'label' => 'TEX', 'full' => '60 TEX'],
        'PU кожа' => ['code' => '07', 'label' => 'O', 'full' => '07 O'],
    ];

    private const MATERIAL_DISPLAY_NAMES = [
        'ПП' => 'Полипропилен',
    ];

    public function parse(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray(null, true, false, false);

        if (empty($rows)) {
            return ['headers' => [], 'rows' => []];
        }

        $headers = array_map(fn ($h) => trim((string) $h), array_shift($rows));
        $mapping = config('labels.templates.foho_default.columns_mapping');

        $columnMap = [];
        foreach ($headers as $index => $header) {
            if (isset($mapping[$header])) {
                $columnMap[$index] = $mapping[$header];
            }
        }

        $parsedRows = [];
        foreach ($rows as $rowIndex => $row) {
            if ($this->isEmptyRow($row)) {
                continue;
            }

            $mapped = [];
            foreach ($columnMap as $colIndex => $fieldKey) {
                $value = $row[$colIndex] ?? '';

                if ($value instanceof \DateTimeInterface || $this->isNumericDate($value)) {
                    $date = $value instanceof \DateTimeInterface
                        ? $value
                        : Date::excelToDateTimeObject($value);
                    $value = Carbon::instance($date)->locale('ru')->isoFormat('MMMM YYYY');
                    $value = mb_strtoupper(mb_substr($value, 0, 1)) . mb_substr($value, 1);
                } else {
                    $value = trim((string) $value);
                }

                $mapped[$fieldKey] = $value;
            }

            $rawComposition = $mapped['composition'] ?? '';
            $compositionParsed = $this->parseComposition($rawComposition);

            $mapped['composition_raw'] = $rawComposition;
            $mapped['composition'] = $compositionParsed['normalized'] ?? $rawComposition;
            $mapped['recycling'] = $compositionParsed['recycling'] ?? null;

            $sizeParsed = $this->parseSize($mapped['size'] ?? '');
            $mapped['size'] = $sizeParsed['normalized'];
            $mapped['is_circular'] = $sizeParsed['is_circular'];

            $parsedRows[] = [
                'row' => $rowIndex + 2,
                'data' => $mapped,
            ];
        }

        $spreadsheet->disconnectWorksheets();

        return [
            'headers' => $headers,
            'column_map' => $columnMap,
            'rows' => $parsedRows,
        ];
    }

    public function parseComposition(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return ['normalized' => '', 'materials' => [], 'recycling' => null];
        }

        $materials = $this->extractMaterials($raw);

        if (empty($materials)) {
            return ['normalized' => $raw, 'materials' => [], 'recycling' => null];
        }

        $normalizedParts = [];
        foreach ($materials as $mat) {
            $displayName = self::MATERIAL_DISPLAY_NAMES[$mat['name']] ?? $mat['name'];
            $normalizedParts[] = $mat['percentage'] . '% ' . $displayName;
        }
        $normalized = implode(', ', $normalizedParts);

        $dominant = $this->findDominantMaterial($materials);
        $recycling = $dominant
            ? (self::RECYCLING_CODES[$dominant['name']] ?? null)
            : null;

        return [
            'normalized' => $normalized,
            'materials' => $materials,
            'recycling' => $recycling,
        ];
    }

    public function parseSize(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return ['normalized' => '', 'is_circular' => false];
        }

        $cleaned = preg_replace('/\s+/', '', $raw);

        if (preg_match('/^\d+(\.\d+)?$/u', $cleaned)) {
            return [
                'normalized' => $cleaned . ' см',
                'is_circular' => true,
            ];
        }

        $rectPattern = '/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)(?:\s*[+\\-]\s*(\d+(?:\.\d+)?))?\s*(?:см)?$/ui';
        if (preg_match($rectPattern, $raw, $m)) {
            $normalized = $m[1] . 'x' . $m[2] . ' см';
            return [
                'normalized' => $normalized,
                'is_circular' => false,
            ];
        }

        return [
            'normalized' => $raw,
            'is_circular' => false,
        ];
    }

    private function extractMaterials(string $raw): array
    {
        preg_match_all('/(\d+)\s*%\s*([^%\d,;+]+)/ui', $raw, $matches, PREG_SET_ORDER);

        $materials = [];
        $seen = [];

        foreach ($matches as $match) {
            $percentage = (int) $match[1];
            $rawName = trim($match[2]);
            $normalizedName = $this->normalizeMaterialName($rawName);

            if ($normalizedName === null) {
                continue;
            }

            if (!isset($seen[$normalizedName])) {
                $seen[$normalizedName] = count($materials);
                $materials[] = [
                    'name' => $normalizedName,
                    'percentage' => $percentage,
                ];
            }
        }

        return $materials;
    }

    private function normalizeMaterialName(string $raw): ?string
    {
        $cleaned = mb_strtolower(trim(preg_replace('/[^а-яёa-z\s]/ui', '', $raw)));

        if ($cleaned === '') {
            return null;
        }

        foreach (self::MATERIAL_ALIASES as $alias => $canonical) {
            if ($cleaned === $alias) {
                return $canonical;
            }
        }

        $closest = null;
        $closestLen = 0;
        foreach (self::MATERIAL_ALIASES as $alias => $canonical) {
            $aliasLen = mb_strlen($alias);
            $dist = levenshtein($cleaned, $alias);
            if ($dist <= 2 && $aliasLen > $closestLen) {
                $closest = $canonical;
                $closestLen = $aliasLen;
            }
        }

        return $closest;
    }

    private function findDominantMaterial(array $materials): ?array
    {
        if (empty($materials)) {
            return null;
        }

        usort($materials, fn ($a, $b) => $b['percentage'] <=> $a['percentage']);

        return $materials[0];
    }

    private function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn ($v) => $v !== null && $v !== ''));
    }

    private function isNumericDate(mixed $value): bool
    {
        return is_numeric($value) && $value > 40000 && $value < 60000;
    }
}
