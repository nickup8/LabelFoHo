<?php

namespace App\Http\Requests\Labels;

use Illuminate\Foundation\Http\FormRequest;

class SelectTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'session_id' => 'required|string|exists:label_sessions,id',
            'template_id' => 'required|string|in:foho_default',
        ];
    }
}
