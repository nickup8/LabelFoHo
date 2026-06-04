<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabelTemplate extends Model
{
    protected $table = 'label_templates';

    protected $fillable = [
        'title',
        'importer_name',
        'importer_address',
        'importer_phone',
        'manufacturer_name',
        'default_width_px',
        'default_height_px',
        'is_active',
        'canvas_elements',
        'template_type',
    ];

    protected function casts(): array
    {
        return [
            'default_width_px' => 'integer',
            'default_height_px' => 'integer',
            'is_active' => 'boolean',
            'canvas_elements' => 'array',
        ];
    }
}
