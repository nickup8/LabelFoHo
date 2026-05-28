<?php

namespace App\Services\Labels;

class ValidationService
{
    public function validate(array $parsedData, string $templateId = 'foho_default'): array
    {
        $template = config("labels.templates.{$templateId}");
        $rules = $template['validation'] ?? [];
        $requiredFields = $rules['required'] ?? [];
        $validatedRows = [];

        foreach ($parsedData['rows'] as $entry) {
            $errors = [];
            $data = $entry['data'];

            foreach ($requiredFields as $field) {
                $value = $data[$field] ?? '';
                if (empty($value) && $value !== '0') {
                    $errors[] = "Поле '{$field}' обязательно";
                }
            }

            if (! empty($data['barcode'])) {
                $barcodeErrors = $this->validateBarcode($data['barcode'], $rules['barcode'] ?? []);
                $errors = array_merge($errors, $barcodeErrors);
            }

            if (! empty($data['size'])) {
                $sizeErrors = $this->validateSize($data['size'], $rules['size'] ?? []);
                $errors = array_merge($errors, $sizeErrors);
            }

            if (! empty($data['composition'])) {
                $compositionErrors = $this->validateComposition($data);
                $errors = array_merge($errors, $compositionErrors);
            }

            $validatedRows[] = [
                'row' => $entry['row'],
                'data' => $data,
                'errors' => $errors,
                'is_valid' => empty($errors),
            ];
        }

        return $validatedRows;
    }

    private function validateComposition(array $data): array
    {
        $errors = [];

        $recycling = $data['recycling'] ?? null;
        $composition = $data['composition'] ?? '';

        if ($composition !== '' && $recycling === null) {
            $errors[] = 'Не удалось распознать состав материала для подбора знака переработки';
        }

        return $errors;
    }

    private function validateBarcode(string $barcode, array $rules): array
    {
        $errors = [];
        if (! preg_match('/^\d{13}$/', $barcode)) {
            $errors[] = 'Штрихкод должен содержать 13 цифр';

            return $errors;
        }
        if (($rules['checksum'] ?? false) && ! $this->checkEan13Checksum($barcode)) {
            $errors[] = 'Некорректная контрольная сумма EAN-13';
        }

        return $errors;
    }

    private function validateSize(string $size, array $rules): array
    {
        $errors = [];
        if (! empty($rules['pattern']) && ! preg_match($rules['pattern'], $size)) {
            $errors[] = 'Неверный формат размера (ожидается: Ш x В см, напр. 30x40 см)';
        }

        return $errors;
    }

    private function checkEan13Checksum(string $barcode): bool
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $barcode[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        $checksum = (10 - ($sum % 10)) % 10;

        return (int) $barcode[12] === $checksum;
    }
}
