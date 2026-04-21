<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class TeamDocumentController extends Controller
{
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
            $current = Document::find($parentId);
            while ($current) {
                array_unshift($breadcrumbs, [
                    'id' => $current->id,
                    'name' => $current->name,
                ]);
                $current = $current->parent;
            }
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

        return back();
    }

    public function storeFile(Request $request, Team $team)
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:documents,id',
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx',
            'is_sop' => 'nullable|boolean',
        ]);

        $file = $request->file('file');

        $document = $team->documents()->create([
            'user_id' => $request->user()->id,
            'name' => $file->getClientOriginalName(),
            'type' => 'file',
            'is_sop' => $request->boolean('is_sop'),
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

        return back();
    }

    public function storeDocument(Request $request, Team $team)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'is_sop' => 'nullable|boolean',
            'parent_id' => 'nullable|exists:documents,id',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp',
        ]);

        $document = $team->documents()->create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'type' => 'document',
            'content' => $validated['content'],
            'is_sop' => $request->boolean('is_sop'),
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
            'new_attachments' => 'nullable|array|max:5',
            'new_attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp',
        ]);

        $oldName = $document->name;

        $document->update([
            'name' => $validated['name'],
            'content' => $validated['content'] ?? $document->content,
            'is_sop' => $request->has('is_sop') ? $request->boolean('is_sop') : $document->is_sop,
        ]);

        if (! empty($validated['removed_media_ids'])) {
            $document->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        if ($request->hasFile('new_attachments')) {
            foreach ($request->file('new_attachments') as $file) {
                $document->addMedia($file)->toMediaCollection('attachments');
            }
        }

        $logEvent = 'updated';
        $logName = $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document');
        $logDescription = $oldName !== $validated['name']
            ? "Mangganti nama menjadi: {$document->name}"
            : "Memperbarui isi dokumen: {$document->name}";

        ActivityLogger::log(
            event: $logEvent,
            logName: $logName,
            description: $logDescription,
            subject: $document,
            teamId: $team->id,
        );

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
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx',
            'is_sop' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        if ($request->has('is_sop')) {
            $document->update(['is_sop' => $request->boolean('is_sop')]);
        }

        // Spatie Media Library allows multiple files in a collection.
        // We just add a new one, and it will be part of the history.
        $document->addMedia($file)->toMediaCollection('files');

        // We can optionally update the document's recorded name to match the matched new file
        // if that's desired, but let's keep the user's defined name mostly or update it if it's identical currently.

        ActivityLogger::log(
            event: 'uploaded_new_version',
            logName: 'document_file',
            description: "Memperbarui versi file dokumen: {$document->name}",
            subject: $document,
            teamId: $team->id,
        );

        return back();
    }

    public function destroy(Team $team, Document $document)
    {
        $canModify = request()->user()->id === $document->user_id
            || request()->user()->hasAnyRole(['superadmin', 'admin']);

        abort_unless($canModify, 403, 'Hanya pemilik atau admin yang dapat menghapus dokumen ini.');

        // Determine log type before deletion
        $logName = $document->type === 'folder' ? 'document_folder' : ($document->type === 'file' ? 'document_file' : 'document');
        $docName = $document->name;

        $document->delete();

        ActivityLogger::log(
            event: 'deleted',
            logName: $logName,
            description: "Menghapus {$document->type}: {$docName}",
            teamId: $team->id,
        );

        return (($request->headers->get('referer') && str_contains($request->headers->get('referer'), '/edit')))
            ? redirect()->route('documents.index', ['team' => $team])
            : back();
    }
}
