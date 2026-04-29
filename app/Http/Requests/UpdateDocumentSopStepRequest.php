<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentSopStepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['superadmin', 'admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'action' => ['nullable', 'string'],
            'keywords' => ['nullable', 'array'],
            'keywords.*' => ['string', 'max:100'],
            'required_evidence' => ['required', Rule::in(['comment', 'media', 'both'])],
            'priority' => ['required', Rule::in(['high', 'medium', 'low'])],
            'weight' => ['required', 'integer', 'min:0', 'max:255'],
            'min_comment' => ['required', 'integer', 'min:0', 'max:255'],
            'min_media' => ['required', 'integer', 'min:0', 'max:255'],
            'kanban_column_id' => ['nullable', 'uuid', 'exists:kanban_columns,id'],
            'score_kurang' => ['required', 'integer', 'min:0'],
            'score_cukup' => ['required', 'integer', 'gte:score_kurang'],
            'score_sangat_baik' => ['required', 'integer', 'gte:score_cukup'],
            'is_mandatory' => ['required', 'boolean'],
        ];
    }
}
