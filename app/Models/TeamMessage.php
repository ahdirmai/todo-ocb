<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class TeamMessage extends Model implements HasMedia
{
    use HasFactory, HasUuids, InteractsWithMedia;

    protected $guarded = [];

    protected $appends = ['attachments_data'];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Register media collection for file attachments. */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments');
    }

    /**
     * Get serialized attachment data for the frontend.
     *
     * @return array<int, array{id: int, name: string, url: string, mime: string, size: int}>
     */
    public function getAttachmentsDataAttribute(): array
    {
        return $this->getMedia('attachments')->map(fn (Media $media) => [
            'id' => $media->id,
            'name' => $media->file_name,
            'url' => $media->getUrl(),
            'mime' => $media->mime_type,
            'size' => $media->size,
        ])->toArray();
    }
}
