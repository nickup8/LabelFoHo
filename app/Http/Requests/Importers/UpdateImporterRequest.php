<?php

namespace App\Http\Requests\Importers;

use Illuminate\Foundation\Http\FormRequest;

class UpdateImporterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:1000',
            'legal_address' => 'required|string|max:2000',
            'phone' => 'required|string|max:100',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название организации',
            'name.max' => 'Название организации слишком длинное (максимум 1000 символов)',
            'legal_address.required' => 'Укажите юридический адрес',
            'legal_address.max' => 'Юридический адрес слишком длинный (максимум 2000 символов)',
            'phone.required' => 'Укажите телефон',
            'phone.max' => 'Телефон слишком длинный (максимум 100 символов)',
        ];
    }
}
