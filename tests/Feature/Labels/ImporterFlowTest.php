<?php

use App\Models\Importer;
use App\Models\LabelSession;
use App\Services\Labels\ValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

uses(RefreshDatabase::class);

function currentGuestToken(): string
{
    $token = Str::random(40);

    test()->withCookie(config('session.cookie'), $token);

    return $token;
}

function makeLabelSession(array $attributes = []): LabelSession
{
    return LabelSession::create(array_merge([
        'guest_token' => currentGuestToken(),
        'original_filename' => 'test.xlsx',
        'stored_file_path' => 'uploads/test.xlsx',
        'parsed_data' => ['headers' => [], 'rows' => []],
        'validation_results' => [],
        'template_id' => 'foho_default',
        'template_type' => 'napkin',
        'status' => 'audited',
    ], $attributes));
}

function makeImporterCard(array $attributes = []): Importer
{
    return Importer::saveCard(array_merge([
        'name' => 'ИП Климин П. А.',
        'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
        'phone' => '+7 (995) 771-27-92',
    ], $attributes));
}

function validRow(int $row, string $factory): array
{
    return [
        'row' => $row,
        'data' => [
            'product_name' => 'Набор салфеток для сервировки стола - 4 шт.',
            'supplier_article' => "PLACE00{$row}",
            'barcode' => '2037225797833',
            'size' => '38 см',
            'is_circular' => true,
            'composition' => '100% ПВХ',
            'recycling' => ['code' => '03', 'label' => 'PVC'],
            'factory_name' => $factory,
            'manufacture_date' => 'Август 2026',
        ],
        'errors' => [],
        'is_valid' => true,
    ];
}

test('выбор импортёра в мастере отсутствует', function () {
    $session = makeLabelSession();

    $this->post('/labels/select-importer', [
        'session_id' => $session->id,
        'importer_id' => 1,
    ])->assertNotFound();

    expect($session->fresh()->getAttributes())->not->toHaveKey('importer_id');
});

test('мастер передаёт единую карточку импортёра вместо справочника', function () {
    makeImporterCard();
    $session = makeLabelSession();

    $this->get('/labels?session='.$session->id.'&step=2')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Labels/Index')
            ->where('importer.name', 'ИП Климин П. А.')
            ->where('importer.is_complete', true)
            ->missing('importers'));
});

test('экспорт блокируется без карточки импортёра со ссылкой на заполнение', function () {
    $session = makeLabelSession([
        'validation_results' => [validRow(2, 'NINGBO BAULER CO., LTD.')],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertStatus(422);
    expect($response->json('error'))->toContain('Карточка импортёра не заполнена');
    expect($response->json('error_code'))->toBe('importer_card_incomplete');
    expect($response->json('importer_card_url'))->toBe(url('/importers'));
});

test('экспорт блокируется при незаполненных реквизитах карточки', function () {
    $card = makeImporterCard();
    $card->update(['phone' => '   ']);

    $session = makeLabelSession([
        'validation_results' => [validRow(2, 'NINGBO BAULER CO., LTD.')],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertStatus(422);
    expect($response->json('error_code'))->toBe('importer_card_incomplete');
});

test('экспорт использует реквизиты общей карточки', function () {
    $card = makeImporterCard([
        'name' => 'Общество с ограниченной ответственностью «Новый Импортёр»',
        'legal_address' => '115280, Россия, г. Москва, ул. Ленинская Слобода, д. 26, стр. 5, офис 412',
        'phone' => '+7 (495) 123-45-67, доб. 10',
    ]);
    $session = makeLabelSession([
        'validation_results' => [validRow(2, 'NINGBO BAULER CO., LTD.')],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertOk();
    expect($response->json('importer.name'))->toBe($card->name);
    expect($response->json('importer.address'))->toBe($card->legal_address);
    expect($response->json('importer.phone'))->toBe($card->phone);
    expect($response->json('labels.0.importer_name'))->toBe($card->name);
    expect($response->json('labels.0.importer_address'))->toBe($card->legal_address);
    expect($response->json('labels.0.importer_phone'))->toBe($card->phone);
});

test('изменённые реквизиты карточки попадают в следующий экспорт', function () {
    makeImporterCard();
    $session = makeLabelSession([
        'validation_results' => [validRow(2, 'NINGBO BAULER CO., LTD.')],
    ]);

    $first = $this->get('/labels/download?session_id='.$session->id);
    expect($first->json('importer.name'))->toBe('ИП Климин П. А.');

    Importer::saveCard([
        'name' => 'ИП Климин П. А. (обновлено)',
        'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
        'phone' => '+7 (000) 111-22-33',
    ]);

    $second = $this->get('/labels/download?session_id='.$session->id);
    expect($second->json('importer.name'))->toBe('ИП Климин П. А. (обновлено)');
    expect($second->json('importer.phone'))->toBe('+7 (000) 111-22-33');
    expect($second->json('labels.0.importer_name'))->toBe('ИП Климин П. А. (обновлено)');
});

test('одна карточка действует для всех сессий', function () {
    $card = makeImporterCard();
    $token = currentGuestToken();

    $first = makeLabelSession([
        'guest_token' => $token,
        'validation_results' => [validRow(2, 'NINGBO BAULER CO., LTD.')],
    ]);
    $second = makeLabelSession([
        'guest_token' => $token,
        'validation_results' => [validRow(3, 'Ningbo Huafu Home Goods Co., Ltd')],
    ]);

    test()->withCookie(config('session.cookie'), $token);

    $firstResponse = $this->get('/labels/download?session_id='.$first->id);
    expect($firstResponse->json('importer.name'))->toBe($card->name);

    $secondResponse = $this->get('/labels/download?session_id='.$second->id);
    expect($secondResponse->json('importer.name'))->toBe($card->name);
    expect(Importer::count())->toBe(1);
});

test('разные строки Excel выводят своих изготовителей', function () {
    makeImporterCard();
    $session = makeLabelSession([
        'validation_results' => [
            validRow(2, 'NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.'),
            validRow(3, 'Ningbo Huafu Home Goods Co., Ltd'),
        ],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertOk();
    expect($response->json('labels.0.factory_name'))
        ->toBe('NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.');
    expect($response->json('labels.1.factory_name'))
        ->toBe('Ningbo Huafu Home Goods Co., Ltd');
});

test('пустой изготовитель блокирует экспорт с указанием номера строки', function () {
    makeImporterCard();
    $session = makeLabelSession([
        'validation_results' => [
            validRow(2, 'NINGBO BAULER CO., LTD.'),
            validRow(5, '   '),
        ],
    ]);

    $response = $this->get('/labels/download?session_id='.$session->id);

    $response->assertStatus(422);
    expect($response->json('error'))->toContain('Строка 5');
    expect($response->json('error'))->toContain('Название фабрики');
});

test('валидация помечает строку с пустым изготовителем адресной ошибкой', function () {
    $service = app(ValidationService::class);

    $result = $service->validate([
        'rows' => [
            [
                'row' => 7,
                'data' => [
                    'product_name' => 'Набор салфеток',
                    'supplier_article' => 'PLACE001',
                    'barcode' => '2037225797833',
                    'size' => '38 см',
                    'composition' => '100% ПВХ',
                    'recycling' => ['code' => '03', 'label' => 'PVC'],
                    'factory_name' => '   ',
                ],
            ],
        ],
    ]);

    expect($result[0]['is_valid'])->toBeFalse();
    expect($result[0]['errors'])->toContain(
        'Изготовитель (столбец «Название фабрики») не указан'
    );
});

test('прежний загрузочный Excel остаётся совместимым', function () {
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['Наименование', 'Артикул поставщика', 'Баркод', 'Размер товара', 'Дата производства', 'Состав', 'Название фабрики'],
        ['Набор салфеток для сервировки стола - 4 шт.', 'PLACE001', '2037225797833', 38, 'Август 2026', '100% ПВХ', 'NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.'],
        ['Набор салфеток для сервировки стола - 4 шт.', 'PLACE002', '2037225799257', 38, 'Август 2026', '100% ПВХ', 'Ningbo Huafu Home Goods Co., Ltd'],
    ]);

    $writer = new Xlsx($spreadsheet);
    $path = tempnam(sys_get_temp_dir(), 'labels').'.xlsx';
    $writer->save($path);
    $spreadsheet->disconnectWorksheets();

    $file = UploadedFile::fake()->createWithContent(
        'labels.xlsx',
        file_get_contents($path)
    );
    unlink($path);

    $this->post('/labels/upload', ['file' => $file, 'category' => 'napkins'])->assertRedirect();

    $session = LabelSession::latest('created_at')->first();

    expect($session)->not->toBeNull();

    $rows = $session->validation_results;

    expect($rows)->toHaveCount(2);
    expect($rows[0]['data']['factory_name'])
        ->toBe('NINGBO BAULER NEW MATERIAL TECHNOLOGY CO., LTD.');
    expect($rows[1]['data']['factory_name'])
        ->toBe('Ningbo Huafu Home Goods Co., Ltd');
    expect(collect($rows)->every(fn ($row) => $row['is_valid']))->toBeTrue();
});
