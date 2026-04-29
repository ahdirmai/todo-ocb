<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\DocumentDetailResource;
use App\Models\Document;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    private function clearOtherTeamSopFlags(Team $team, ?string $exceptDocumentId = null): void
    {
        $team->documents()
            ->where('is_sop', true)
            ->when(
                $exceptDocumentId !== null,
                fn ($query) => $query->where('id', '!=', $exceptDocumentId)
            )
            ->update(['is_sop' => false]);
    }

    private function documentAttachmentRules(?array $allowedMimes = null): array
    {
        return [
            'file',
            'max:'.config('uploads.documents.max_file_kb'),
            'mimes:'.implode(',', $allowedMimes ?? config('uploads.documents.allowed_mimes', [])),
        ];
    }

    public function storeFolder(Request $request, Team $team)
    {
        $this->authorizeTeamMember($request, $team);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:documents,id'],
        ]);

        $document = $team->documents()->create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'type' => 'folder',
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        ActivityLogger::log(
            event: 'created',
            logName: 'document_folder',
            description: "Membuat folder dokumen: {$document->name}",
            subject: $document,
            teamId: $team->id,
        );

        return response()->json([
            'message' => 'Folder created successfully.',
            'data' => DocumentDetailResource::make($this->loadDocument($document)),
        ], 201);
    }

    public function storeFile(Request $request, Team $team)
    {
        $this->authorizeTeamMember($request, $team);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'exists:documents,id'],
            'files' => ['required', 'array', 'min:1'],
            'files.*' => $this->documentAttachmentRules(),
            'is_sop' => ['nullable', 'boolean'],
        ]);

        $markAsSop = $request->boolean('is_sop');

        if ($markAsSop) {
            $this->clearOtherTeamSopFlags($team);
        }

        $documents = [];

        foreach ($request->file('files') as $file) {
            $document = $team->documents()->create([
                'user_id' => $request->user()->id,
                'name' => $file->getClientOriginalName(),
                'type' => 'file',
                'is_sop' => $markAsSop,
                'parent_id' => $validated['parent_id'] ?? null,
            ]);

            $document->addMedia($file)->toMediaCollection('files');
            $documents[] = DocumentDetailResource::make($this->loadDocument($document));

            ActivityLogger::log(
                event: 'uploaded',
                logName: 'document_file',
                description: "Mengunggah file dokumen: {$document->name}",
                subject: $document,
                teamId: $team->id,
            );
        }

        return response()->json([
            'message' => 'Files uploaded successfully.',
            'data' => $documents,
        ], 201);
    }

    public function storePage(Request $request, Team $team)
    {
        $this->authorizeTeamMember($request, $team);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'is_sop' => ['nullable', 'boolean'],
            'parent_id' => ['nullable', 'exists:documents,id'],
            'attachments' => ['nullable', 'array', 'max:'.config('uploads.documents.max_attachments')],
            'attachments.*' => $this->documentAttachmentRules(),
        ]);

        $markAsSop = $request->boolean('is_sop');

        if ($markAsSop) {
            $this->clearOtherTeamSopFlags($team);
        }

        $document = $team->documents()->create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'type' => 'document',
            'content' => $validated['content'],
            'is_sop' => $markAsSop,
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $document->addMedia($file)->toMediaCollection('attachments');
            }
        }

        ActivityLogger::log(
            event: 'created',
            logName: 'document',
            description: "Membuat dokumen: {$document->name}",
            subject: $document,
            teamId: $team->id,
        );

        return response()->json([
            'message' => 'Document created successfully.',
            'data' => DocumentDetailResource::make($this->loadDocument($document)),
        ], 201);
    }

    public function update(Request $request, Team $team, Document $document)
    {
        $this->authorizeDocumentModification($request, $document);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'is_sop' => ['nullable', 'boolean'],
            'removed_media_ids' => ['nullable', 'array'],
            'removed_media_ids.*' => ['integer'],
            'new_attachments' => ['nullable', 'array', 'max:'.config('uploads.documents.max_attachments')],
            'new_attachments.*' => $this->documentAttachmentRules(),
        ]);

        $oldName = $document->name;

        $document->update([
            'name' => $validated['name'],
            'content' => $validated['content'] ?? $document->content,
            'is_sop' => $request->has('is_sop') ? $request->boolean('is_sop') : $document->is_sop,
        ]);

        if ($document->is_sop) {
            $this->clearOtherTeamSopFlags($team, $document->id);
        }

        if (! empty($validated['removed_media_ids'])) {
            $document->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        if ($request->hasFile('new_attachments')) {
            foreach ($request->file('new_attachments') as $file) {
                $document->addMedia($file)->toMediaCollection('attachments');
            }
        }

        ActivityLogger::log(
            event: 'updated',
            logName: $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document'),
            description: $oldName !== $validated['name']
                ? "Mangganti nama menjadi: {$document->name}"
                : "Memperbarui isi dokumen: {$document->name}",
            subject: $document,
            teamId: $team->id,
        );

        return response()->json([
            'message' => 'Document updated successfully.',
            'data' => DocumentDetailResource::make($this->loadDocument($document->fresh())),
        ]);
    }

    public function storeFileVersion(Request $request, Team $team, Document $document)
    {
        $this->authorizeDocumentModification($request, $document);

        $request->validate([
            'file' => ['required', ...$this->documentAttachmentRules(['pdf', 'doc', 'docx', 'xls', 'xlsx'])],
            'is_sop' => ['nullable', 'boolean'],
        ]);

        if ($request->has('is_sop')) {
            $document->update(['is_sop' => $request->boolean('is_sop')]);

            if ($document->is_sop) {
                $this->clearOtherTeamSopFlags($team, $document->id);
            }
        }

        $document->addMedia($request->file('file'))->toMediaCollection('files');

        ActivityLogger::log(
            event: 'uploaded_new_version',
            logName: 'document_file',
            description: "Memperbarui versi file dokumen: {$document->name}",
            subject: $document,
            teamId: $team->id,
        );

        return response()->json([
            'message' => 'Document file version uploaded successfully.',
            'data' => DocumentDetailResource::make($this->loadDocument($document->fresh())),
        ]);
    }

    public function destroy(Request $request, Team $team, Document $document)
    {
        $this->authorizeDocumentModification($request, $document);

        $logName = $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document');
        $docName = $document->name;
        $documentType = $document->type;
        $document->delete();

        ActivityLogger::log(
            event: 'deleted',
            logName: $logName,
            description: "Menghapus {$documentType}: {$docName}",
            teamId: $team->id,
        );

        return response()->noContent();
    }

    private function authorizeTeamMember(Request $request, Team $team): void
    {
        if ($request->user()->hasRole(['superadmin', 'admin'])) {
            return;
        }

        abort_unless($team->users()->whereKey($request->user()->id)->exists(), 403);
    }

    private function authorizeDocumentModification(Request $request, Document $document): void
    {
        $canModify = $request->user()->id === $document->user_id
            || $request->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat mengubah dokumen ini.');
    }

    private function loadDocument(Document $document): Document
    {
        return $document->load([
            'user',
            'parent',
            'children.user',
            'media',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->with(['user', 'media', 'replies.user', 'replies.media'])
                ->latest(),
        ]);
    }
}
