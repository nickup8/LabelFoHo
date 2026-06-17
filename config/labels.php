<?php

return [
    'brand' => [
        'name' => 'FoHo',
        'trademark' => 'FoHo',
        'importer' => 'ИП Климин П.А.',
    ],

    'templates' => [
        'foho_default' => [
            'name' => 'FoHo Стандарт',
            'description' => 'Стандартный шаблон маркировки FoHo с EAN-13 и полным составом',
            'orientation' => 'vertical',
            'page_width_mm' => 60,
            'page_height_mm' => 100,
            'margin_mm' => 3,
            'font_family' => 'Roboto, sans-serif',

            'columns_mapping' => [
                'Наименование' => 'product_name',
                'Артикул поставщика' => 'supplier_article',
                'Баркод' => 'barcode',
                'Размер товара' => 'size',
                'Состав' => 'composition',
                'Изготовитель' => 'manufacturer',
                'Название фабрики' => 'factory_name',
                'Дата производства' => 'manufacture_date',
            ],

            'validation' => [
                'required' => ['barcode', 'supplier_article', 'product_name', 'size', 'factory_name'],
                'barcode' => [
                    'type' => 'ean13',
                    'length' => 13,
                    'checksum' => true,
                ],
                'size' => [
                    'pattern' => '/^\d+(?:[.,]\d+)?(?:\s*[xх×]\s*\d+(?:[.,]\d+)?)?\s*см$/ui',
                ],
                'composition' => [
                    'extract' => ['ПВХ', 'ПЭТ', 'полиэстер', 'хлопок'],
                    'pattern' => '/\d+\s*%\s*(ПВХ|ПЭТ|полиэстер|хлопок)/ui',
                ],
            ],

            'sections' => [
                'header' => ['y_mm' => 3, 'height_mm' => 25],
                'details' => ['y_mm' => 30, 'height_mm' => 28],
                'barcode' => ['y_mm' => 60, 'height_mm' => 22],
                'footer' => ['y_mm' => 85, 'height_mm' => 12],
            ],

            'fields' => [
                'product_name' => [
                    'label' => null,
                    'position' => 'header',
                    'font_size' => 9,
                    'font_weight' => 'bold',
                    'max_length' => 60,
                ],
                'supplier_article' => [
                    'label' => 'Артикул:',
                    'position' => 'header',
                    'font_size' => 8,
                ],
                'size' => [
                    'label' => 'Размер:',
                    'position' => 'details',
                    'font_size' => 8,
                    'tolerance_cm' => 1,
                ],
                'composition' => [
                    'label' => 'Состав:',
                    'position' => 'details',
                    'font_size' => 7,
                ],
                'barcode' => [
                    'label' => null,
                    'position' => 'barcode',
                    'type' => 'ean13',
                ],
                'manufacturer' => [
                    'label' => 'Изготовитель:',
                    'position' => 'footer',
                    'font_size' => 6,
                ],
                'manufacture_date' => [
                    'label' => 'Дата:',
                    'position' => 'footer',
                    'font_size' => 6,
                    'format' => 'month_year',
                ],
            ],

            'static' => [
                'trademark' => 'FoHo',
                'importer' => 'ИП Климин П.А.',
                'certification_marks' => ['EAC', 'ТР ТС 017/2011'],
                'manufacturer_default' => '',
            ],
        ],
    ],
];
