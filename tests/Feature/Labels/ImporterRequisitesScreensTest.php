<?php

use App\Models\Importer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function screenCard(array $overrides = []): array
{
    return array_merge([
        'name' => 'ООО «Тест-Импорт»',
        'legal_address' => '123456, Москва, Тестовая улица, 1',
        'phone' => '+7 (000) 111-22-33',
    ], $overrides);
}

test('/labels/settings передаёт реквизиты карточки импортёра в редактор', function () {
    Importer::saveCard(screenCard());

    $this->get('/labels/settings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Labels/Settings')
            ->where('importer.name', 'ООО «Тест-Импорт»')
            ->where('importer.legal_address', '123456, Москва, Тестовая улица, 1')
            ->where('importer.phone', '+7 (000) 111-22-33'));
});

test('/labels/settings без карточки передаёт importer=null', function () {
    $this->get('/labels/settings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Labels/Settings')
            ->where('importer', null));
});

test('/label передаёт реквизиты карточки импортёра', function () {
    Importer::saveCard(screenCard());

    $this->get('/label')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Label')
            ->where('importer.name', 'ООО «Тест-Импорт»')
            ->where('importer.legal_address', '123456, Москва, Тестовая улица, 1')
            ->where('importer.phone', '+7 (000) 111-22-33'));
});

test('/label без карточки передаёт importer=null', function () {
    $this->get('/label')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Label')
            ->where('importer', null));
});

test('после изменения карточки оба экрана показывают новые реквизиты', function () {
    Importer::saveCard(screenCard());

    $this->get('/label')->assertInertia(fn (Assert $page) => $page
        ->where('importer.phone', '+7 (000) 111-22-33'));

    Importer::saveCard(screenCard([
        'name' => 'ИП Обновлённый',
        'phone' => '+7 (999) 000-11-22',
    ]));

    $this->get('/label')->assertInertia(fn (Assert $page) => $page
        ->where('importer.name', 'ИП Обновлённый')
        ->where('importer.phone', '+7 (999) 000-11-22'));

    $this->get('/labels/settings')->assertInertia(fn (Assert $page) => $page
        ->where('importer.name', 'ИП Обновлённый')
        ->where('importer.phone', '+7 (999) 000-11-22'));
});

test('незаполненная карточка не подставляет старые реквизиты', function () {
    Importer::saveCard(screenCard());
    Importer::query()->delete();

    $this->get('/label')->assertInertia(fn (Assert $page) => $page
        ->where('importer', null));

    $this->get('/labels/settings')->assertInertia(fn (Assert $page) => $page
        ->where('importer', null));
});
