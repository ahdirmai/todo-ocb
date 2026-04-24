<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index(Request $request)
    {
        $tags = Tag::query()
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return response()->json([
            'data' => $tags->getCollection()->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'color' => $tag->color,
            ])->values(),
            'links' => [
                'first' => $tags->url(1),
                'last' => $tags->url($tags->lastPage()),
                'prev' => $tags->previousPageUrl(),
                'next' => $tags->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $tags->currentPage(),
                'from' => $tags->firstItem(),
                'last_page' => $tags->lastPage(),
                'path' => $tags->path(),
                'per_page' => $tags->perPage(),
                'to' => $tags->lastItem(),
                'total' => $tags->total(),
            ],
        ]);
    }
}
