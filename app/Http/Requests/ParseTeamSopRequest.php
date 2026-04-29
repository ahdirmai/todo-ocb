<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParseTeamSopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['superadmin', 'admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'document_id' => ['required', 'uuid', 'exists:documents,id'],
            'platform' => ['nullable', Rule::in(['openai', 'anthropic', 'gemini'])],
        ];
    }
}
