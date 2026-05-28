<?php

namespace App\Services\Labels;

class TemplateService
{
    public function getTemplate(string $templateId): ?array
    {
        return config("labels.templates.{$templateId}");
    }

    public function getAllTemplates(): array
    {
        return config('labels.templates', []);
    }

    public function getFieldMapping(string $templateId): array
    {
        return config("labels.templates.{$templateId}.columns_mapping", []);
    }

    public function getBrandConfig(): array
    {
        return config('labels.brand', []);
    }

    public function getStaticContent(string $templateId): array
    {
        return config("labels.templates.{$templateId}.static", []);
    }
}
