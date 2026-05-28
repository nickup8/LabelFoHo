<?php

namespace App\Services\Labels;

use Picqer\Barcode\BarcodeGeneratorPNG;

class BarcodeService
{
    public function generateEan13(string $barcode): string
    {
        $generator = new BarcodeGeneratorPNG;

        return $generator->getBarcode($barcode, $generator::TYPE_EAN_13, 2, 50);
    }

    public function generateEan13Base64(string $barcode): string
    {
        return base64_encode($this->generateEan13($barcode));
    }

    public function generateEan13DataUri(string $barcode): string
    {
        return 'data:image/png;base64,'.$this->generateEan13Base64($barcode);
    }

    public function validateEan13(string $barcode): bool
    {
        if (! preg_match('/^\d{13}$/', $barcode)) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $barcode[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        $checksum = (10 - ($sum % 10)) % 10;

        return (int) $barcode[12] === $checksum;
    }
}
