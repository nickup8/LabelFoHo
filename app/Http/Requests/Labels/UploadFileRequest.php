<?php

namespace App\Http\Requests\Labels;

use Illuminate\Foundation\Http\FormRequest;

class UploadFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Необходимо выбрать файл',
            'file.mimes' => 'Файл должен быть в формате XLSX, XLS или CSV',
            'file.max' => 'Размер файла не должен превышать 10 МБ',
        ];
    }
}
