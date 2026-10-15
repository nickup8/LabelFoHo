<?php

use App\Models\LabelSession;
use App\Services\Labels\ExcelParsingService;
use App\Services\Labels\ValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

uses(RefreshDatabase::class);

function categoryFixtureFile(string $composition): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['Наименование', 'Артикул поставщика', 'Баркод', 'Размер товара', 'Дата производства', 'Состав', 'Название фабрики'],
        ['Коврик для дома', 'PLACE001', '2037225797833', 38, 'Август 2026', $composition, 'NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.'],
    ]);

    $writer = new Xlsx($spreadsheet);
    $path = tempnam(sys_get_temp_dir(), 'category').'.xlsx';
    $writer->save($path);
    $spreadsheet->disconnectWorksheets();

    $file = UploadedFile::fake()->createWithContent(
        'category.xlsx',
        file_get_contents($path)
    );
    unlink($path);

    return $file;
}

function categoryBaseRow(array $overrides = []): array
{
    return array_merge([
        'product_name' => 'Коврик для дома',
        'supplier_article' => 'PLACE001',
        'barcode' => '2037225797833',
        'size' => '38 см',
        'composition' => '100% ПВХ',
        'composition_raw' => '100% ПВХ',
        'recycling' => ['code' => '03', 'label' => 'PVC'],
        'factory_name' => 'NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.',
        'manufacture_date' => 'Август 2026',
    ], $overrides);
}

test('загрузка без категории отклоняется сервером', function () {
    $file = categoryFixtureFile('100% ПВХ');

    $this->post('/labels/upload', ['file' => $file])
        ->assertSessionHasErrors('category');

    expect(LabelSession::count())->toBe(0);
});

test('загрузка с категорией сохраняет её и авто-назначает единственный шаблон', function () {
    currentGuestToken();

    $this->post('/labels/upload', [
        'file' => categoryFixtureFile('100% ПВХ'),
        'category' => 'napkins',
    ])->assertRedirect();

    $napkin = LabelSession::latest('created_at')->first();
    expect($napkin->category)->toBe('napkins');
    expect($napkin->template_type)->toBe('napkin');
    expect($napkin->template_id)->toBe('foho_default');

    $this->post('/labels/upload', [
        'file' => categoryFixtureFile('100% ПВХ'),
        'category' => 'mats',
    ])->assertRedirect();

    $mat = LabelSession::latest('created_at')->first();
    expect($mat->category)->toBe('mats');
    expect($mat->template_type)->toBeNull();
});

test('недопустимая категория отклоняется', function () {
    $this->post('/labels/upload', [
        'file' => categoryFixtureFile('100% ПВХ'),
        'category' => 'tags',
    ])->assertSessionHasErrors('category');
});

test('многослойный состав коврика без процентов не даёт ошибку знака', function () {
    $raw = 'Лицевая сторона: полиэстер; Наполнитель: пенополиуретан; Обратная сторона: ПВХ';
    $row = ['row' => 2, 'data' => categoryBaseRow([
        'composition' => $raw,
        'composition_raw' => $raw,
        'recycling' => null,
    ])];

    $service = app(ValidationService::class);

    $matResult = $service->validate(['rows' => [$row]], 'foho_default', 'mats');
    expect($matResult[0]['is_valid'])->toBeTrue();

    $napkinResult = $service->validate(['rows' => [$row]], 'foho_default', 'napkins');
    expect($napkinResult[0]['is_valid'])->toBeFalse();
    expect($napkinResult[0]['errors'])->toContain(
        'Не удалось распознать состав материала для подбора знака переработки'
    );
});

test('пустой состав — ошибка для обеих категорий', function () {
    $row = ['row' => 2, 'data' => categoryBaseRow([
        'composition' => '',
        'composition_raw' => '',
        'recycling' => null,
    ])];

    $service = app(ValidationService::class);

    foreach (['mats', 'napkins'] as $category) {
        $result = $service->validate(['rows' => [$row]], 'foho_default', $category);
        expect($result[0]['is_valid'])->toBeFalse();
        expect($result[0]['errors'])->toContain('Состав не указан');
    }
});

test('разбор сохраняет многослойный состав без процентов дословно', function () {
    $raw = "Лицевая сторона: полиэстер\nНаполнитель: пенополиуретан\nОбратная сторона: ПВХ";
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['Наименование', 'Артикул поставщика', 'Баркод', 'Размер товара', 'Дата производства', 'Состав', 'Название фабрики'],
        ['Коврик для дома', 'PLACE001', '2037225797833', 38, 'Август 2026', $raw, 'NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.'],
    ]);

    $writer = new Xlsx($spreadsheet);
    $path = tempnam(sys_get_temp_dir(), 'category').'.xlsx';
    $writer->save($path);
    $spreadsheet->disconnectWorksheets();

    $parsed = app(ExcelParsingService::class)->parse($path);
    unlink($path);

    expect($parsed['rows'][0]['data']['composition_raw'])->toBe($raw);
});

test('payload экспорта содержит полный исходный состав', function () {
    makeImporterCard();

    $raw = 'Лицевая сторона: 80% полиэстер; Наполнитель: 20% полиуретан; Обратная сторона: ПВХ';
    $session = makeLabelSession([
        'category' => 'mats',
        'template_type' => null,
        'template_id' => null,
        'validation_results' => [
            [
                'row' => 2,
                'data' => categoryBaseRow([
                    'composition' => $raw,
                    'composition_raw' => $raw,
                    'recycling' => null,
                ]),
                'errors' => [],
                'is_valid' => true,
            ],
        ],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertOk();
    expect($response->json('labels.0.composition_raw'))->toBe($raw);
});

test('сервер отклоняет шаблон, не соответствующий категории', function () {
    $napkinSession = makeLabelSession(['category' => 'napkins']);

    $this->post('/labels/select-template', [
        'session_id' => $napkinSession->id,
        'template_type' => 'mat',
    ])->assertSessionHasErrors('template_type');

    $matsSession = makeLabelSession(['category' => 'mats']);

    $this->post('/labels/select-template', [
        'session_id' => $matsSession->id,
        'template_type' => 'napkin',
    ])->assertSessionHasErrors('template_type');

    $this->post('/labels/select-template', [
        'session_id' => $matsSession->id,
        'template_type' => 'tag',
    ])->assertRedirect();

    expect($matsSession->fresh()->template_type)->toBe('tag');
});

test('шаг выбора шаблона пропускается при одном доступном шаблоне', function () {
    makeImporterCard();
    $napkinSession = makeLabelSession([
        'category' => 'napkins',
        'template_type' => 'napkin',
        'template_id' => 'foho_default',
        'validation_results' => [
            ['row' => 2, 'data' => categoryBaseRow(), 'errors' => [], 'is_valid' => true],
        ],
    ]);

    $this->get('/labels?session='.$napkinSession->id.'&step=3')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Labels/Index')
            ->where('step', 4));

    $matsSession = makeLabelSession([
        'category' => 'mats',
        'template_type' => null,
        'template_id' => null,
    ]);

    $this->get('/labels?session='.$matsSession->id.'&step=3')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Labels/Index')
            ->where('step', 3));
});

test('смена категории сбрасывает аудит, шаблон и статус', function () {
    $session = makeLabelSession([
        'category' => 'napkins',
        'template_type' => 'napkin',
        'template_id' => 'foho_default',
        'status' => 'audited',
        'validation_results' => [
            ['row' => 2, 'data' => categoryBaseRow(), 'errors' => [], 'is_valid' => true],
        ],
    ]);

    $this->post('/labels/category', [
        'session_id' => $session->id,
        'category' => 'mats',
    ])->assertRedirect();

    $fresh = $session->fresh();
    expect($fresh->category)->toBe('mats');
    expect($fresh->validation_results)->toBeNull();
    expect($fresh->parsed_data)->toBeNull();
    expect($fresh->template_type)->toBeNull();
    expect($fresh->template_id)->toBeNull();
    expect($fresh->status)->toBe('uploaded');
});

test('после сброса сессии шаг аудита возвращает на загрузку', function () {
    $session = makeLabelSession([
        'category' => 'napkins',
        'template_type' => 'napkin',
        'template_id' => 'foho_default',
        'status' => 'audited',
        'validation_results' => [
            ['row' => 2, 'data' => categoryBaseRow(), 'errors' => [], 'is_valid' => true],
        ],
    ]);

    $this->post('/labels/category', [
        'session_id' => $session->id,
        'category' => 'mats',
    ])->assertRedirect();

    $this->get('/labels?session='.$session->id.'&step=2')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Labels/Index')
            ->where('step', 1));
});
