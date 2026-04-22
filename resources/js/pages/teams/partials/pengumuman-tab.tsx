import { usePage, router } from '@inertiajs/react';
import {
    Loader2,
    MessageSquare,
    MoreHorizontal,
    Paperclip,
    Pencil,
    Reply,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import React, { useState, useRef } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

function formatFileSize(bytes: number) {
    if (bytes < 1024) {
return `${bytes} B`;
}

    if (bytes < 1024 * 1024) {
return `${(bytes / 1024).toFixed(1)} KB`;
}

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
    return mime?.startsWith('image/');
}

function getInitials(name: string) {
    return (
        name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() || 'U'
    );
}

function CommentItem({ comment, auth, onReply }: any) {
    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const canDelete = comment.user_id === auth?.user?.id || isGlobalAdmin;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editAttachments, setEditAttachments] = useState<File[]>([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState<number[]>([]);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const startEditing = (c: any) => {
        setEditingId(c.id);
        setEditContent(c.content);
        setEditAttachments([]);
        setEditRemovedMediaIds([]);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
        setEditAttachments([]);
        setEditRemovedMediaIds([]);
    };

    const saveEdit = (id: string) => {
        if (!editContent.replace(/<p><\/p>/g, '').trim()) {
return;
}

        router.put(
            `/comments/${id}`,
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

    const handleDelete = () => {
        if (!confirm('Hapus komentar ini?')) {
return;
}

        router.delete(`/comments/${comment.id}`, { preserveScroll: true });
    };

    return (
        <div className="mb-3 flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {getInitials(comment.user?.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="mb-1 flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {comment.user?.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>
                            {new Date(comment.created_at).toLocaleDateString(
                                'id-ID',
                                {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                },
                            )}
                        </span>
                        {comment.user_id === auth?.user?.id && (
                            <button
                                onClick={() => startEditing(comment)}
                                className="transition-colors hover:text-primary"
                                title="Edit komentar"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={handleDelete}
                                className="transition-colors hover:text-red-500"
                                title="Hapus komentar"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                {editingId === comment.id ? (
                    <div className="flex flex-col gap-2">
                        <RichTextEditor
                            content={editContent}
                            onChange={setEditContent}
                        />
                        {editAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {editAttachments.map((f, i) => (
                                    <span
                                        key={i}
                                        className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] dark:bg-zinc-800"
                                    >
                                        <Paperclip className="h-3 w-3" />{' '}
                                        {f.name}
                                        <button
                                            onClick={() =>
                                                setEditAttachments((prev) =>
                                                    prev.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        {comment.media && comment.media.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {comment.media.map((m: any) =>
                                    editRemovedMediaIds.includes(m.id) ? null : (
                                        <span
                                            key={m.id}
                                            className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                                        >
                                            <Paperclip className="h-3 w-3" />
                                            <span className="max-w-[100px] truncate">
                                                {m.file_name}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setEditRemovedMediaIds(
                                                        (prev) => [
                                                            ...prev,
                                                            m.id,
                                                        ],
                                                    )
                                                }
                                                className="ml-1 text-red-500 hover:text-red-700"
                                                title="Hapus lampiran"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ),
                                )}
                            </div>
                        )}
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={editFileInputRef}
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    setEditAttachments((prev) => [
                                        ...prev,
                                        ...Array.from(e.target.files!),
                                    ]);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="flex h-7 items-center gap-1 text-xs text-muted-foreground"
                                onClick={() =>
                                    editFileInputRef.current?.click()
                                }
                            >
                                <Paperclip className="h-3.5 w-3.5" />{' '}
                                Lampirkan File
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={cancelEditing}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => saveEdit(comment.id)}
                                >
                                    Simpan
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="text-sm text-slate-700 dark:text-slate-300 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:m-0 [&_strong]:font-bold [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                )}

                {comment.media && comment.media.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {comment.media.map((m: any) =>
                            isImage(m.mime_type) ? (
                                <a
                                    key={m.id}
                                    href={m.original_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block h-24 w-24 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                >
                                    <img
                                        src={m.original_url}
                                        className="h-full w-full object-cover"
                                        alt="attachment"
                                    />
                                </a>
                            ) : (
                                <a
                                    key={m.id}
                                    href={m.original_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                >
                                    <Paperclip className="h-3 w-3" />{' '}
                                    <span className="max-w-[120px] truncate">
                                        {m.file_name}
                                    </span>
                                </a>
                            ),
                        )}
                    </div>
                )}

                <button
                    onClick={() => onReply(comment.id)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary"
                >
                    <Reply className="h-3 w-3" /> Balas
                </button>

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-zinc-800">
                        {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                                <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                                    <AvatarImage src={reply.user?.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-[8px] text-primary">
                                        {getInitials(reply.user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="mb-0.5 flex items-start justify-between">
                                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                            {reply.user?.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                            <span>
                                                {new Date(
                                                    reply.created_at,
                                                ).toLocaleDateString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            {reply.user_id ===
                                                auth?.user?.id && (
                                                <button
                                                    onClick={() =>
                                                        startEditing(reply)
                                                    }
                                                    className="transition-colors hover:text-primary"
                                                    title="Edit balasan"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            )}
                                            {(reply.user_id ===
                                                auth?.user?.id ||
                                                isGlobalAdmin) && (
                                                <button
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                'Hapus balasan ini?',
                                                            )
                                                        ) {
router.delete(
                                                                `/comments/${reply.id}`,
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
}
                                                    }}
                                                    className="transition-colors hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {editingId === reply.id ? (
                                        <div className="flex flex-col gap-2">
                                            <RichTextEditor
                                                content={editContent}
                                                onChange={setEditContent}
                                            />
                                            {editAttachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {editAttachments.map(
                                                        (f, i) => (
                                                            <span
                                                                key={i}
                                                                className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] dark:bg-zinc-800"
                                                            >
                                                                <Paperclip className="h-3 w-3" />{' '}
                                                                {f.name}
                                                                <button
                                                                    onClick={() =>
                                                                        setEditAttachments(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        _,
                                                                                        idx,
                                                                                    ) =>
                                                                                        idx !==
                                                                                        i,
                                                                                ),
                                                                        )
                                                                    }
                                                                    className="ml-1 text-red-500 hover:text-red-700"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                            {reply.media &&
                                                reply.media.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {reply.media.map(
                                                            (m: any) =>
                                                                editRemovedMediaIds.includes(
                                                                    m.id,
                                                                ) ? null : (
                                                                    <span
                                                                        key={
                                                                            m.id
                                                                        }
                                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                                                                    >
                                                                        <Paperclip className="h-3 w-3" />
                                                                        <span className="max-w-[100px] truncate">
                                                                            {
                                                                                m.file_name
                                                                            }
                                                                        </span>
                                                                        <button
                                                                            onClick={() =>
                                                                                setEditRemovedMediaIds(
                                                                                    (
                                                                                        prev,
                                                                                    ) => [
                                                                                        ...prev,
                                                                                        m.id,
                                                                                    ],
                                                                                )
                                                                            }
                                                                            className="ml-1 text-red-500 hover:text-red-700"
                                                                            title="Hapus lampiran"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </span>
                                                                ),
                                                        )}
                                                    </div>
                                                )}
                                            <div className="flex items-center justify-between">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex h-6 items-center gap-1 text-xs text-muted-foreground"
                                                    onClick={() =>
                                                        editFileInputRef.current?.click()
                                                    }
                                                >
                                                    <Paperclip className="h-3.5 w-3.5" />{' '}
                                                    Lampirkan File
                                                </Button>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={cancelEditing}
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={() =>
                                                            saveEdit(reply.id)
                                                        }
                                                    >
                                                        Simpan
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="text-xs text-slate-700 dark:text-slate-300 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:m-0 [&_strong]:font-bold [&_ul]:list-disc"
                                            dangerouslySetInnerHTML={{
                                                __html: reply.content,
                                            }}
                                        />
                                    )}
                                    {reply.media && reply.media.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                            {reply.media.map((m: any) =>
                                                isImage(m.mime_type) ? (
                                                    <a
                                                        key={m.id}
                                                        href={m.original_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block h-16 w-16 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                                    >
                                                        <img
                                                            src={m.original_url}
                                                            className="h-full w-full object-cover"
                                                            alt="attachment"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        key={m.id}
                                                        href={m.original_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                                    >
                                                        <Paperclip className="h-3 w-3" />{' '}
                                                        <span className="max-w-[100px] truncate">
                                                            {m.file_name}
                                                        </span>
                                                    </a>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AnnouncementItem({ announcement, team, auth }: any) {
    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const isTeamAdmin =
        team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role ===
        'admin';
    const canEditDelete = isGlobalAdmin || isTeamAdmin;

    const [commentContent, setCommentContent] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit state
    const [editTitle, setEditTitle] = useState(announcement.title || '');
    const [editContent, setEditContent] = useState(announcement.content || '');
    const [saving, setSaving] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    const handleDelete = () => {
        if (confirm('Hapus pengumuman ini secara permanen?')) {
            router.delete(`/announcements/${announcement.id}`, {
                preserveScroll: true,
            });
        }
    };

    const handleSaveEdit = () => {
        setSaving(true);
        router.put(
            `/announcements/${announcement.id}`,
            {
                title: editTitle,
                content: editContent,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaving(false);
                    setIsEditing(false);
                },
                onError: () => setSaving(false),
            },
        );
    };

    const handleComment = () => {
        const cleanContent = commentContent.replace(/<p><\/p>/g, '').trim();

        if ((!cleanContent && attachments.length === 0) || sending) {
return;
}

        setSending(true);
        router.post(
            `/announcements/${announcement.id}/comments`,
            {
                content: cleanContent || '<p></p>',
                parent_id: replyingTo,
                attachments: attachments,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSending(false);
                    setCommentContent('');
                    setAttachments([]);
                    setReplyingTo(null);

                    if (fileRef.current) {
fileRef.current.value = '';
}
                },
                onError: () => setSending(false),
            },
        );
    };

    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={announcement.user?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {getInitials(announcement.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {announcement.user?.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            {new Date(
                                announcement.created_at,
                            ).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                </div>
                {canEditDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground"
                            >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditTitle(announcement.title || '');
                                    setEditContent(announcement.content || '');
                                }}
                            >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                Pengumuman
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={handleDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content body */}
            {isEditing ? (
                <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Judul Pengumuman (Opsional)"
                        className="font-semibold"
                    />
                    <RichTextEditor
                        content={editContent}
                        onChange={setEditContent}
                        users={team?.users}
                        disabled={saving}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={saving}
                            onClick={handleSaveEdit}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Menyimpan
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    {announcement.title && (
                        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                            {announcement.title}
                        </h3>
                    )}
                    <div
                        className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{
                            __html: announcement.content,
                        }}
                    />

                    {/* Media render */}
                    {announcement.media && announcement.media.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {announcement.media.map((m: any) =>
                                isImage(m.mime_type) ? (
                                    <a
                                        key={m.id}
                                        href={m.original_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block max-w-[300px] overflow-hidden rounded-lg border border-slate-200 transition hover:shadow-md dark:border-slate-700"
                                    >
                                        <img
                                            src={m.original_url}
                                            className="h-auto w-full"
                                            alt={m.file_name}
                                        />
                                    </a>
                                ) : (
                                    <a
                                        key={m.id}
                                        href={m.original_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex min-w-[200px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/80"
                                    >
                                        <div className="rounded-md bg-primary/10 p-2">
                                            <Paperclip className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {m.file_name}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {formatFileSize(m.size)}
                                            </div>
                                        </div>
                                    </a>
                                ),
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Comments List */}
            <div className="border-t border-slate-200 pt-4 dark:border-zinc-800">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-4 w-4" />{' '}
                    {announcement.comments?.length || 0} Komentar
                </div>

                {announcement.comments
                    ?.filter((c: any) => !c.parent_id)
                    .map((comment: any) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            team={team}
                            auth={auth}
                            onReply={setReplyingTo}
                        />
                    ))}

                {/* Comment Form */}
                <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4 text-sm dark:border-zinc-800">
                    <Avatar className="hidden h-8 w-8 shrink-0 sm:block">
                        <AvatarImage src={auth?.user?.avatar_url} />
                        <AvatarFallback>
                            {getInitials(auth?.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="relative flex flex-1 flex-col gap-2">
                        {replyingTo && (
                            <div className="-mb-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-muted-foreground dark:border-zinc-700/50 dark:bg-zinc-800/50">
                                <span>Membalas komentar...</span>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="hover:text-slate-900 dark:hover:text-slate-100"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <RichTextEditor
                            content={commentContent}
                            onChange={setCommentContent}
                            users={team?.users}
                            disabled={sending}
                            placeholder={
                                replyingTo
                                    ? 'Tulis balasan... ketik @ untuk tag anggota'
                                    : 'Tulis komentar... ketik @ untuk tag anggota'
                            }
                            minHeight="min-h-[40px]"
                        />

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((f, i) => (
                                    <span
                                        key={i}
                                        className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <Paperclip className="h-3 w-3" />{' '}
                                        <span className="max-w-[100px] truncate">
                                            {f.name}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setAttachments(
                                                    attachments.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-1 flex items-center justify-between">
                            <input
                                type="file"
                                ref={fileRef}
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
setAttachments([
                                            ...attachments,
                                            ...Array.from(e.target.files),
                                        ]);
}
                                }}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px]"
                                onClick={() => fileRef.current?.click()}
                                type="button"
                            >
                                <Paperclip className="mr-1 h-3.5 w-3.5" />{' '}
                                Lampirkan file
                            </Button>

                            <Button
                                size="sm"
                                className="h-8"
                                disabled={
                                    sending ||
                                    (!commentContent
                                        .replace(/<p><\/p>/g, '')
                                        .trim() &&
                                        attachments.length === 0)
                                }
                                onClick={handleComment}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{' '}
                                        Mengirim
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-1.5 h-3.5 w-3.5" />{' '}
                                        Kirim
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PengumumanTab({ team }: { team: any }) {
    const { announcements, auth } = usePage<any>().props;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleCreate = () => {
        const cleanContent = content.replace(/<p><\/p>/g, '').trim();

        if (!cleanContent) {
return;
}

        setCreating(true);
        router.post(
            `/teams/${team.id}/announcements`,
            {
                title,
                content: cleanContent,
                attachments,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setCreating(false);
                    setTitle('');
                    setContent('');
                    setAttachments([]);
                    setShowForm(false);

                    if (fileRef.current) {
fileRef.current.value = '';
}
                },
                onError: () => setCreating(false),
            },
        );
    };

    return (
        <div className="custom-scrollbar flex h-full max-h-[calc(100vh-14rem)] flex-col overflow-y-auto pr-2">
            <div className="mx-auto w-full max-w-4xl">
                {/* Form Bikin Pengumuman Baru */}
                {!showForm ? (
                    <div
                        className="group mb-6 flex cursor-text items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sidebar-border dark:border-zinc-800 dark:bg-zinc-900"
                        onClick={() => setShowForm(true)}
                    >
                        <div className="flex w-full items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={auth?.user?.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(auth?.user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-sm text-muted-foreground transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                Buat pengumuman baru untuk tim...
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-white p-5 shadow-sm dark:border-primary/30 dark:bg-zinc-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                Buat Pengumuman
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:bg-slate-100"
                                onClick={() => setShowForm(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul (Opsional)"
                                className="text-md border-slate-200 bg-slate-50 font-semibold placeholder:font-normal dark:border-zinc-700 dark:bg-zinc-800/50"
                            />

                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                users={team?.users}
                                disabled={creating}
                                placeholder="Isi pengumuman Anda di sini... ketik @ untuk tag anggota"
                            />

                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {attachments.map((f, i) => (
                                        <span
                                            key={i}
                                            className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                        >
                                            <Paperclip className="h-3.5 w-3.5 text-primary" />{' '}
                                            <span className="max-w-[150px] truncate">
                                                {f.name}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setAttachments(
                                                        attachments.filter(
                                                            (_, idx) =>
                                                                idx !== i,
                                                        ),
                                                    )
                                                }
                                                className="ml-1 text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <input
                                    type="file"
                                    ref={fileRef}
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) {
setAttachments([
                                                ...attachments,
                                                ...Array.from(e.target.files),
                                            ]);
}
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileRef.current?.click()}
                                    type="button"
                                    className="gap-2"
                                >
                                    <Paperclip className="h-4 w-4" /> Lampirkan
                                    file
                                </Button>

                                <Button
                                    size="sm"
                                    disabled={
                                        creating ||
                                        !content.replace(/<p><\/p>/g, '').trim()
                                    }
                                    onClick={handleCreate}
                                    className="px-6"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                                            Posting
                                        </>
                                    ) : (
                                        'Posting Pengumuman'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Pengumuman */}
                {!announcements || announcements.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                            <MessageSquare className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-300">
                            Belum ada pengumuman
                        </h3>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                            Gunakan fitur ini untuk membagikan informasi
                            penting, update proyek, atau pembaruan kepada
                            seluruh anggota tim.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {announcements.data.map((announcement: any) => (
                            <AnnouncementItem
                                key={announcement.id}
                                announcement={announcement}
                                team={team}
                                auth={auth}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
