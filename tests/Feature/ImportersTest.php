<?php

use App\Models\Importer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function cardPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'ИП Климин П. А.',
        'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
        'phone' => '+7 (995) 771-27-92',
    ], $overrides);
}

test('страница импортёра отображает форму карточки', function () {
    $this->get('/importers')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Importers/Index')
            ->where('importer', null));
});

test('страница восстанавливает сохранённые значения карточки', function () {
    Importer::saveCard(cardPayload());

    $this->get('/importers')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Importers/Index')
            ->where('importer.name', 'ИП Климин П. А.')
            ->where('importer.legal_address', '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9')
            ->where('importer.phone', '+7 (995) 771-27-92'));
});

test('первое сохранение создаёт единственную карточку', function () {
    $response = $this->put('/importers', cardPayload([
        'name' => 'ООО «Длинное Название Организации Для Проверки»',
        'legal_address' => str_repeat('Юридический адрес, длинный и подробный. ', 20),
        'phone' => '+7 (995) 771-27-92, доб. 101',
    ]));

    $response->assertRedirect('/importers');
    $response->assertSessionHas('success');

    expect(Importer::count())->toBe(1);

    $card = Importer::current();

    expect($card->name)->toBe('ООО «Длинное Название Организации Для Проверки»');
    expect($card->legal_address)->toBe(rtrim(str_repeat('Юридический адрес, длинный и подробный. ', 20)));
    expect($card->phone)->toBe('+7 (995) 771-27-92, доб. 101');
});

test('повторное сохранение обновляет ту же карточку', function () {
    Importer::saveCard(cardPayload());

    $this->put('/importers', cardPayload([
        'name' => 'ИП Климин П. А. (обновлено)',
        'phone' => '+7 (000) 111-22-33',
    ]))->assertRedirect('/importers');

    expect(Importer::count())->toBe(1);

    $card = Importer::current();

    expect($card->name)->toBe('ИП Климин П. А. (обновлено)');
    expect($card->phone)->toBe('+7 (000) 111-22-33');
    expect($card->legal_address)->toBe('358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9');
});

test('все три реквизита обязательны', function () {
    $this->from('/importers')
        ->put('/importers', [
            'name' => '',
            'legal_address' => '',
            'phone' => '',
        ])
        ->assertRedirect('/importers')
        ->assertSessionHasErrors(['name', 'legal_address', 'phone']);

    expect(Importer::count())->toBe(0);
});

test('значения из одних пробелов не проходят валидацию', function () {
    $this->from('/importers')
        ->put('/importers', [
            'name' => '   ',
            'legal_address' => " \n ",
            'phone' => '   ',
        ])
        ->assertSessionHasErrors(['name', 'legal_address', 'phone']);

    expect(Importer::count())->toBe(0);
});

test('телефон сохраняется строкой со знаком плюс и форматированием', function () {
    $phone = '+7 (995) 771-27-92 / +7 926 000-00-00';

    $this->put('/importers', cardPayload(['phone' => $phone]));

    expect(Importer::current()->phone)->toBe($phone);
});

test('уникальный индекс singleton запрещает вторую запись на уровне БД', function () {
    Importer::saveCard(cardPayload());

    DB::table('importers')->insert([
        'name' => 'Второй',
        'legal_address' => 'Адрес',
        'phone' => '+7 000 000-00-00',
        'singleton' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
})->throws(Exception::class);

test('параллельные сохранения не создают вторую карточку', function () {
    $results = [];

    $requests = [
        cardPayload(['name' => 'Первый вариант', 'phone' => '+7 111 111-11-11']),
        cardPayload(['name' => 'Второй вариант', 'phone' => '+7 222 222-22-22']),
        cardPayload(['name' => 'Третий вариант', 'phone' => '+7 333 333-33-33']),
    ];

    foreach ($requests as $payload) {
        $results[] = $this->put('/importers', $payload);
    }

    foreach ($results as $response) {
        $response->assertRedirect('/importers');
    }

    expect(Importer::count())->toBe(1);
    expect(Importer::current())->not->toBeNull();
});

test('saveCard создаёт карточку при отсутствии и обновляет при наличии', function () {
    $first = Importer::saveCard(cardPayload(['name' => 'Первая']));
    $second = Importer::saveCard(cardPayload(['name' => 'Вторая']));

    expect(Importer::count())->toBe(1);
    expect($first->id)->toBe($second->id);
    expect($second->name)->toBe('Вторая');
});

test('миграция объединяет идентичные карточки без потери значений', function () {
    DB::table('importers')->insert([
        [
            'name' => 'ИП Климин П. А.',
            'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
            'phone' => '+7 (995) 771-27-92',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'name' => 'ИП Климин П. А.',
            'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
            'phone' => '+7 (995) 771-27-92',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $migration = include database_path('migrations/2026_10_13_000003_make_importer_card_singleton.php');
    $migration->consolidateToSingleCard();

    $cards = DB::table('importers')->get();

    expect($cards)->toHaveCount(1);
    expect($cards[0]->name)->toBe('ИП Климин П. А.');
    expect($cards[0]->legal_address)->toBe('358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9');
    expect($cards[0]->phone)->toBe('+7 (995) 771-27-92');
    expect($cards[0]->singleton)->toBe(1);
});

test('миграция при различающихся реквизитах сохраняет раннюю карточку', function () {
    DB::table('importers')->insert([
        [
            'name' => 'ИП Климин П. А.',
            'legal_address' => '358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9',
            'phone' => '+7 (995) 771-27-92',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'name' => 'ООО «Ромашка-Юг»',
            'legal_address' => '117105, Москва, Варшавское шоссе, 12',
            'phone' => '+7 (495) 123-45-67',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $migration = include database_path('migrations/2026_10_13_000003_make_importer_card_singleton.php');
    $migration->consolidateToSingleCard();

    $cards = DB::table('importers')->get();

    expect($cards)->toHaveCount(1);
    expect($cards[0]->name)->toBe('ИП Климин П. А.');
});

test('в базе данных хранится ровно одна карточка', function () {
    Importer::saveCard(cardPayload());

    expect(Importer::count())->toBe(1);
    expect(Importer::current()->singleton)->toBe(1);
});
