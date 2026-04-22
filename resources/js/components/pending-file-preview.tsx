import { ImageIcon, Paperclip, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

export function PendingFilePreview({
    file,
    onRemove,
    label,
}: {
    file: File;
    onRemove: () => void;
    label?: string;
}) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isImageFile(file)) {
            setPreviewUrl(null);

            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (previewUrl) {
        return (
            <div className="w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="relative h-28 w-full bg-slate-100 dark:bg-zinc-800">
                    <img
                        src={previewUrl}
                        alt={file.name}
                        className="h-full w-full object-cover"
                    />
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/75"
                        title="Hapus file"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
                <div className="flex items-start gap-2 p-3">
                    <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                            {file.name}
                            {label ? ` (${label})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {formatFileSize(file.size)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {file.name}
                    {label ? ` (${label})` : ''}
                </div>
                <div className="text-[11px] text-slate-400">
                    {formatFileSize(file.size)}
                </div>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                title="Hapus file"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
