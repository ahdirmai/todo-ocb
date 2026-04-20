<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class TeamTaskIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kanban_id' => ['nullable', 'uuid'],
            'column_id' => ['nullable', 'uuid'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'tag_id' => ['nullable', 'uuid', 'exists:tags,id'],
            'due_before' => ['nullable', 'date'],
            'due_after' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
