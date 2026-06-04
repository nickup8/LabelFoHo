<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LabelSession extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'original_filename',
        'stored_file_path',
        'parsed_data',
        'validation_results',
        'template_id',
        'template_type',
        'status',
        'output_format',
        'output_path',
    ];

    protected function casts(): array
    {
        return [
            'parsed_data' => 'array',
            'validation_results' => 'array',
        ];
    }
}
