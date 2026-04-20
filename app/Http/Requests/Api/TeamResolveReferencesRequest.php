<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class TeamResolveReferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'min:2', 'max:1000'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }
}
