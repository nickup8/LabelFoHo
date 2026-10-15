<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class Importer extends Model
{
    public const SINGLETON_KEY = 1;

    protected $fillable = [
        'name',
        'legal_address',
        'phone',
        'singleton',
    ];

    /**
     * Возвращает единственную общую карточку импортёра.
     */
    public static function current(): ?self
    {
        return static::query()->first();
    }

    /**
     * Сохраняет единую карточку: создаёт при отсутствии, иначе обновляет.
     * Уникальный индекс по singleton гарантирует одну запись даже при
     * параллельных запросах.
     *
     * @param  array{name: string, legal_address: string, phone: string}  $attributes
     */
    public static function saveCard(array $attributes): self
    {
        return DB::transaction(function () use ($attributes) {
            $card = static::query()->lockForUpdate()->first();

            if ($card) {
                $card->update($attributes);

                return $card;
            }

            try {
                return static::create($attributes + ['singleton' => self::SINGLETON_KEY]);
            } catch (UniqueConstraintViolationException) {
                $card = static::query()->lockForUpdate()->firstOrFail();
                $card->update($attributes);

                return $card;
            }
        });
    }

    /**
     * Карточка пригодна для этикеток, если все реквизиты заполнены.
     */
    public function isComplete(): bool
    {
        return trim($this->name) !== ''
            && trim($this->legal_address) !== ''
            && trim($this->phone) !== '';
    }
}
