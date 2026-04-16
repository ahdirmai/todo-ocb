<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TagController extends Controller
{
    public function index()
    {
        $tags = Tag::with('createdBy:id,name')->orderBy('name')->get();

        return Inertia::render('tags/index', [
            'tags' => $tags,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tags,name',
            'color' => 'required|string|max:20',
        ]);

        Tag::create([
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        return back();
    }

    public function update(Request $request, Tag $tag)
    {
        $validated = $request->validate([
            'name' => "required|string|max:255|unique:tags,name,{$tag->id}",
            'color' => 'required|string|max:20',
        ]);

        $tag->update($validated);

        return back();
    }

    public function destroy(Tag $tag)
    {
        $tag->delete();

        return back();
    }
}
