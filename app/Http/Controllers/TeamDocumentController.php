<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamDocumentController extends Controller
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

    /**
     * @return array<int, string>
     */
    private function documentAttachmentRules(?array $allowedMimes = null): array
    {
        return [
            'file',
            'max:'.config('uploads.documents.max_file_kb'),
            'mimes:'.implode(',', $allowedMimes ?? config('uploads.documents.allowed_mimes', [])),
        ];
    }

    public function index(Team $team, Request $request)
    {
        $parentId = $request->query('parent_id');

        $documents = $team->documents()
            ->where('parent_id', $parentId)
            ->with(['user', 'media'])
            ->latest()
            ->get();

        $breadcrumbs = [];
        if ($parentId) {
            $ancestors = collect();
            $currentId = $parentId;
            $visited = [];

            while ($currentId && ! in_array($currentId, $visited, true)) {
                $visited[] = $currentId;
                $current = Document::query()
                    ->select(['id', 'name', 'parent_id'])
                    ->find($currentId);

                if (! $current) {
                    break;
                }

                $ancestors->prepend([
                    'id' => $current->id,
                    'name' => $current->name,
                ]);
                $currentId = $current->parent_id;
            }

            $breadcrumbs = $ancestors->all();
        }

        return response()->json([
            'documents' => $documents,
            'breadcrumbs' => $breadcrumbs,
        ]);
    }

    public function create(Team $team, Request $request)
    {
        $team->load('users');
        $parentId = $request->query('parent_id');

        return inertia('teams/documents/create', [
            'team' => $team,
            'parentId' => $parentId,
        ]);
    }

    public function storeFolder(Request $request, Team $team)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:documents,id',
        ]);

        try {
            DB::transaction(function () use ($team, $request, $validated): void {
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
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal membuat folder, silakan coba lagi.']);
        }

        return back();
    }

    public function storeFile(Request $request, Team $team)
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:documents,id',
            'files' => 'required|array|min:1',
            'files.*' => $this->documentAttachmentRules(),
            'is_sop' => 'nullable|boolean',
        ]);

        $markAsSop = $request->boolean('is_sop');

        try {
            DB::transaction(function () use ($team, $request, $validated, $markAsSop): void {
                if ($markAsSop) {
                    $this->clearOtherTeamSopFlags($team);
                }

                foreach ($request->file('files') as $file) {
                    $document = $team->documents()->create([
                        'user_id' => $request->user()->id,
                        'name' => $file->getClientOriginalName(),
                        'type' => 'file',
                        'is_sop' => $markAsSop,
                        'parent_id' => $validated['parent_id'] ?? null,
                    ]);

                    $document->addMedia($file)->toMediaCollection('files');

                    ActivityLogger::log(
                        event: 'uploaded',
                        logName: 'document_file',
                        description: "Mengunggah file dokumen: {$document->name}",
                        subject: $document,
                        teamId: $team->id,
                    );
                }
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal mengunggah file, silakan coba lagi.']);
        }

        return back();
    }

    public function storeDocument(Request $request, Team $team)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'is_sop' => 'nullable|boolean',
            'parent_id' => 'nullable|exists:documents,id',
            'attachments' => 'nullable|array|max:'.config('uploads.documents.max_attachments'),
            'attachments.*' => $this->documentAttachmentRules(),
        ]);

        $markAsSop = $request->boolean('is_sop');

        try {
            $document = DB::transaction(function () use ($team, $request, $validated, $markAsSop): Document {
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

                return $document;
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal membuat dokumen, silakan coba lagi.']);
        }

        return redirect()->route('documents.show', ['team' => $team, 'document' => $document]);
    }

    public function show(Team $team, Document $document)
    {
        $document->load(['user', 'comments.user', 'comments.replies.user', 'media']);

        return inertia('teams/documents/show', [
            'team' => $team,
            'document' => $document,
        ]);
    }

    public function edit(Team $team, Document $document)
    {
        $canModify = request()->user()->id === $document->user_id
            || request()->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat mengubah dokumen ini.');

        $document->load('media');

        return inertia('teams/documents/edit', [
            'team' => $team,
            'document' => $document,
        ]);
    }

    public function update(Request $request, Team $team, Document $document)
    {
        $canModify = $request->user()->id === $document->user_id
            || $request->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat mengubah dokumen ini.');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'nullable|string',
            'is_sop' => 'nullable|boolean',
            'removed_media_ids' => 'nullable|array',
            'removed_media_ids.*' => 'integer',
            'new_attachments' => 'nullable|array|max:'.config('uploads.documents.max_attachments'),
            'new_attachments.*' => $this->documentAttachmentRules(),
        ]);

        $oldName = $document->name;

        try {
            DB::transaction(function () use ($document, $validated, $request, $team, $oldName): void {
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

                $logName = $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document');
                $logDescription = $oldName !== $validated['name']
                    ? "Mangganti nama menjadi: {$document->name}"
                    : "Memperbarui isi dokumen: {$document->name}";

                ActivityLogger::log(
                    event: 'updated',
                    logName: $logName,
                    description: $logDescription,
                    subject: $document,
                    teamId: $team->id,
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal memperbarui dokumen, silakan coba lagi.']);
        }

        if ($document->type === 'document') {
            return redirect()->route('documents.show', ['team' => $team, 'document' => $document]);
        }

        return back();
    }

    public function updateFile(Request $request, Team $team, Document $document)
    {
        $canModify = $request->user()->id === $document->user_id
            || $request->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat memperbarui file ini.');

        $validated = $request->validate([
            'file' => [
                'required',
                ...$this->documentAttachmentRules(['pdf', 'doc', 'docx', 'xls', 'xlsx']),
            ],
            'is_sop' => 'nullable|boolean',
        ]);

        $file = $request->file('file');

        try {
            DB::transaction(function () use ($request, $document, $team, $file): void {
                if ($request->has('is_sop')) {
                    $document->update(['is_sop' => $request->boolean('is_sop')]);

                    if ($document->is_sop) {
                        $this->clearOtherTeamSopFlags($team, $document->id);
                    }
                }

                $document->addMedia($file)->toMediaCollection('files');

                ActivityLogger::log(
                    event: 'uploaded_new_version',
                    logName: 'document_file',
                    description: "Memperbarui versi file dokumen: {$document->name}",
                    subject: $document,
                    teamId: $team->id,
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal memperbarui file, silakan coba lagi.']);
        }

        return back();
    }

    public function destroy(Request $request, Team $team, Document $document)
    {
        $canModify = request()->user()->id === $document->user_id
            || request()->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat menghapus dokumen ini.');

        $logName = $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document');
        $docName = $document->name;
        $docType = $document->type;

        try {
            DB::transaction(function () use ($document, $logName, $docName, $docType, $team): void {
                $document->delete();

                ActivityLogger::log(
                    event: 'deleted',
                    logName: $logName,
                    description: "Menghapus {$docType}: {$docName}",
                    teamId: $team->id,
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menghapus dokumen, silakan coba lagi.']);
        }

        return (($request->headers->get('referer') && str_contains($request->headers->get('referer'), '/edit')))
            ? redirect()->route('documents.index', ['team' => $team])
            : back();
    }
}
