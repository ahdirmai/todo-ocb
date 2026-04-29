<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Document extends Model implements HasMedia
{
    use HasUuids, InteractsWithMedia;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_sop' => 'boolean',
            'sop_parse_queued_at' => 'datetime',
            'sop_parse_started_at' => 'datetime',
            'sop_parse_completed_at' => 'datetime',
        ];
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Document::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Document::class, 'parent_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function sopSteps(): HasMany
    {
        return $this->hasMany(DocumentSopStep::class)->orderBy('sequence_order');
    }

    /**
     * Return plain text content for AI parsing.
     * Prefers the `content` column; falls back to the first PDF file path
     * from Spatie Media Library so the caller can read or forward the file.
     *
     * @return array{source: 'text'|'pdf'|'none', content: string|null, file_path: string|null}
     */
    public function getAiReadableContent(): array
    {
        $text = trim((string) ($this->content ?? ''));

        if ($text !== '') {
            return ['source' => 'text', 'content' => $text, 'file_path' => null];
        }

        /** @var Media|null $pdf */
        $pdf = collect([
            ...$this->getMedia('files')->all(),
            ...$this->getMedia('attachments')->all(),
        ])
            ->reverse()
            ->first(fn (Media $media): bool => str_ends_with(strtolower((string) $media->file_name), '.pdf'));

        if ($pdf !== null) {
            return ['source' => 'pdf', 'content' => null, 'file_path' => $pdf->getPath()];
        }

        return ['source' => 'none', 'content' => null, 'file_path' => null];
    }
}
