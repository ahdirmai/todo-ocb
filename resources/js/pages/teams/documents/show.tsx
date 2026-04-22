import { Head, Link, useForm, setLayoutProps, usePage, router } from '@inertiajs/react';
import { ArrowLeft, Send, Paperclip, Download, Pencil, X, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PendingFilePreview } from '@/components/pending-file-preview';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { store as storeDocumentComment, update as updateDocumentComment } from '@/routes/documents/comments';

export default function DocumentShow({
    team,
    document,
}: {
    team: any;
    document: any;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: team.name, href: `/teams/${team.slug}` },
            { title: 'Dokumen', href: `/teams/${team.slug}/document` },
            { title: document.name, href: '#' },
        ],
    });

    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;

    const commentForm = useForm({
        content: '',
    });

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editAttachments, setEditAttachments] = useState<File[]>([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState<number[]>([]);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const isImage = (mime: string) => mime?.startsWith('image/');

    const startEditing = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
        setEditAttachments([]);
        setEditRemovedMediaIds([]);

        if (editFileInputRef.current) {
            editFileInputRef.current.value = '';
        }
    };

    const cancelEditing = () => {
        setEditingCommentId(null);
        setEditContent('');
        setEditAttachments([]);
        setEditRemovedMediaIds([]);

        if (editFileInputRef.current) {
            editFileInputRef.current.value = '';
        }
    };

    const saveEdit = (commentId: string) => {
        if (!editContent.trim()) {
return;
}

        router.put(
            updateDocumentComment.url({ document: document.id, comment: commentId }),
            {
                content: editContent,
                new_attachments: editAttachments,
                removed_media_ids: editRemovedMediaIds,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: cancelEditing,
            },
        );
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        commentForm.post(storeDocumentComment.url(document.id), {
            preserveScroll: true,
            onSuccess: () => commentForm.reset('content'),
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <Head title={document.name} />

            <div className="flex h-full flex-col overflow-y-auto pt-2">
                {/* Top bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-5 dark:border-slate-800">
                    <Link
                        href={`/teams/${team.slug}/document${document.parent_id ? `?parent_id=${document.parent_id}` : ''}`}
                        className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Link>
                </div>

                {/* Content */}
                <div className="mx-auto w-full max-w-8xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
                    {/* Document Article */}
                    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="px-8 pt-12 pb-10 sm:px-12">
                            {/* Title */}
                            <h1 className="mb-8 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-slate-50">
                                {document.name}
                            </h1>

                            {/* Author meta */}
                            <div className="mb-10 flex items-center gap-4 border-b border-slate-100 pb-8 dark:border-zinc-800">
                                <Avatar className="h-12 w-12 border-2 border-primary/10">
                                    <AvatarImage src={document.user?.avatar_url} />
                                    <AvatarFallback className="bg-primary/5 font-semibold text-primary">
                                        {document.user?.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                                        {document.user?.name}
                                    </p>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Diterbitkan{' '}
                                        {new Date(document.created_at).toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div
                                className="tiptap text-[17px] leading-8 text-slate-700 dark:text-slate-300"
                                dangerouslySetInnerHTML={{ __html: document.content }}
                            />

                            {/* Attachments */}
                            {document.media && document.media.length > 0 && (
                                <div className="mt-12 border-t border-slate-100 pt-8 dark:border-zinc-800">
                                    <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                                        Lampiran Tambahan
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {document.media.map((media: any) => (
                                            <a
                                                key={media.id}
                                                href={media.original_url}
                                                download
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-zinc-800 dark:bg-zinc-900/50"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="shrink-0 rounded-lg border bg-white p-2 shadow-sm dark:bg-zinc-950">
                                                        <Paperclip className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                            {media.file_name}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-slate-400">
                                                            {(media.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                                <Download className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-primary" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Discussion Section */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-slate-50">
                            Diskusi
                            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-semibold text-primary">
                                {document.comments?.length || 0}
                            </span>
                        </h3>

                        {/* Comment form */}
                        <form onSubmit={handleComment} className="mb-8">
                            <Textarea
                                value={commentForm.data.content}
                                onChange={(e) => commentForm.setData('content', e.target.value)}
                                placeholder="Bagikan tanggapan atau pertanyaan Anda tentang dokumen ini..."
                                className="mb-3 min-h-[96px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-4 text-[15px] focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/50"
                                required
                            />
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={commentForm.processing}
                                    className="rounded-full px-6"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Kirim Tanggapan
                                </Button>
                            </div>
                        </form>

                        {/* Comments list */}
                        {document.comments && document.comments.length > 0 ? (
                            <div className="space-y-5">
                                {document.comments.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-9 w-9 shrink-0 border shadow-sm">
                                            <AvatarImage src={comment.user?.avatar_url} />
                                            <AvatarFallback className="text-xs">
                                                {comment.user?.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="rounded-2xl border border-slate-100/60 bg-slate-50 px-5 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/60">
                                                <div className="mb-2 flex items-center justify-between gap-4">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {comment.user?.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="shrink-0 text-xs text-slate-400">
                                                            {formatDate(comment.created_at)}
                                                        </span>
                                                        {comment.user_id === auth?.user?.id && editingCommentId !== comment.id && (
                                                            <button
                                                                onClick={() => startEditing(comment)}
                                                                className="text-slate-400 transition hover:text-primary"
                                                                title="Edit komentar"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingCommentId === comment.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <Textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className="min-h-[80px] resize-y rounded-xl text-[15px]"
                                                            autoFocus
                                                        />
                                                        {editAttachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {editAttachments.map((file, index) => (
                                                                    <PendingFilePreview
                                                                        key={`${file.name}-${index}`}
                                                                        file={file}
                                                                        onRemove={() =>
                                                                            setEditAttachments((prev) =>
                                                                                prev.filter((_, fileIndex) => fileIndex !== index),
                                                                            )
                                                                        }
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        {comment.media && comment.media.length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {comment.media.map((media: any) =>
                                                                    editRemovedMediaIds.includes(media.id) ? null : (
                                                                        <span
                                                                            key={media.id}
                                                                            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                                                                        >
                                                                            <Paperclip className="h-3 w-3" />
                                                                            <span className="max-w-[180px] truncate">
                                                                                {media.file_name}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setEditRemovedMediaIds((prev) => [
                                                                                        ...prev,
                                                                                        media.id,
                                                                                    ])
                                                                                }
                                                                                className="text-red-500 transition hover:text-red-700"
                                                                                title="Hapus lampiran"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                        <Input
                                                            ref={editFileInputRef}
                                                            type="file"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const files = e.target.files;

                                                                if (files?.length) {
                                                                    setEditAttachments((prev) => [
                                                                        ...prev,
                                                                        ...Array.from(files),
                                                                    ]);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => editFileInputRef.current?.click()}
                                                            >
                                                                <Paperclip className="mr-1 h-3.5 w-3.5" />
                                                                Lampirkan File
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={cancelEditing}
                                                            >
                                                                <X className="mr-1 h-3.5 w-3.5" />
                                                                Batal
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => saveEdit(comment.id)}
                                                            >
                                                                <Check className="mr-1 h-3.5 w-3.5" />
                                                                Simpan
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                                            {comment.content}
                                                        </p>
                                                        {comment.media && comment.media.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {comment.media.map((media: any) =>
                                                                    isImage(media.mime_type) ? (
                                                                        <a
                                                                            key={media.id}
                                                                            href={media.original_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="block h-24 w-24 overflow-hidden rounded-xl border border-slate-200 transition hover:ring-2 hover:ring-primary/30 dark:border-zinc-800"
                                                                        >
                                                                            <img
                                                                                src={media.original_url}
                                                                                alt={media.file_name}
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        </a>
                                                                    ) : (
                                                                        <a
                                                                            key={media.id}
                                                                            href={media.original_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/15"
                                                                        >
                                                                            <Paperclip className="h-3.5 w-3.5" />
                                                                            <span className="max-w-[220px] truncate">
                                                                                {media.file_name}
                                                                            </span>
                                                                        </a>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                                <p className="text-sm text-slate-500">
                                    Jadilah yang pertama untuk memulai diskusi!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
