import { router, usePage } from '@inertiajs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Calendar,
    Loader2,
    MessageSquare,
    Pencil,
    Reply,
    Trash2,
    X,
    Paperclip,
    Bold,
    Italic,
    List,
    ListOrdered,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PendingFilePreview } from '@/components/pending-file-preview';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const RichTextEditor = ({ content, onChange, disabled }: any) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        editable: !disabled,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[60px] max-h-[200px] overflow-y-auto px-3 py-2 text-sm [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0',
            },
        },
    });

    useEffect(() => {
        if (editor && content === '' && editor.getHTML() !== '<p></p>') {
            editor.commands.setContent('');
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className={`overflow-hidden rounded-lg border border-input bg-background ${disabled ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center gap-1 border-b border-input bg-muted/40 p-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={
                        !editor.can().chain().focus().toggleItalic().run()
                    }
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </Button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskDetailModalProps {
    task: any | null;
    open: boolean;
    onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
    const { tags: globalTags = [], auth, team } = usePage<any>().props;

    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const isTaskCreator = task?.creator_id === auth?.user?.id;
    const isTeamAdmin =
        team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role ===
        'admin';
    const isAssignee = task?.assignees?.some(
        (assignee: any) => assignee.id === auth?.user?.id,
    );
    const canEditTask = Boolean(
        isGlobalAdmin || isTaskCreator || isTeamAdmin || isAssignee,
    );
    const canDeleteTask = Boolean(isGlobalAdmin || isTaskCreator || isTeamAdmin);

    const currentTaskStateKey = task ? `${task.id}:${open ? 'open' : 'closed'}` : 'empty';
    const [syncedTaskStateKey, setSyncedTaskStateKey] =
        useState(currentTaskStateKey);
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        task?.tags?.map((t: any) => t.id) ?? [],
    );
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
        task?.assignees?.map((a: any) => a.id) ?? [],
    );
    const [saving, setSaving] = useState(false);

    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [sendingComment, setSendingComment] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editAttachments, setEditAttachments] = useState<File[]>([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState<number[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const taskFileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    if (syncedTaskStateKey !== currentTaskStateKey) {
        setSyncedTaskStateKey(currentTaskStateKey);
        setTitle(task?.title || '');
        setDescription(task?.description || '');
        setDueDate(task?.due_date?.split('T')[0] || '');
        setSelectedTagIds(task?.tags?.map((t: any) => t.id) ?? []);
        setSelectedAssigneeIds(task?.assignees?.map((a: any) => a.id) ?? []);
        setTaskAttachments([]);
    }

    // Realtime polling
    useEffect(() => {
        if (!open) {
return;
}

        const interval = setInterval(() => {
            router.reload({
                only: ['team'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [open]);

    const toggleTag = (id: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
    };

    const toggleAssignee = (id: string) => {
        setSelectedAssigneeIds((prev) =>
            prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
        );
    };

    const handleSave = () => {
        if (!task) {
return;
}

        setSaving(true);
        router.post(
            TaskActions.update.url(task.id),
            {
                _method: 'put',
                title,
                description,
                due_date: dueDate || undefined,
                tag_ids: selectedTagIds,
                assignee_ids: selectedAssigneeIds,
                attachments: taskAttachments,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setSaving(false);
                    setTaskAttachments([]);

                    if (taskFileInputRef.current) {
taskFileInputRef.current.value = '';
}

                    onClose();
                },
                onError: () => setSaving(false),
            },
        );
    };

    const handleDelete = () => {
        if (!task || !confirm(`Hapus task "${task.title}"?`)) {
return;
}

        router.delete(TaskActions.destroy.url(task.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const handleAddComment = (e?: React.FormEvent) => {
        if (e) {
e.preventDefault();
}

        const cleanContent = commentText.replace(/<p><\/p>/g, '').trim();

        if (
            (!cleanContent && attachments.length === 0) ||
            sendingComment ||
            !task
        ) {
return;
}

        setSendingComment(true);
        router.post(
            `/tasks/${task.id}/comments`,
            {
                content: cleanContent || '<p></p>',
                parent_id: replyingTo,
                attachments: attachments,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setCommentText('');
                    setAttachments([]);
                    setReplyingTo(null);
                    setSendingComment(false);

                    if (fileInputRef.current) {
fileInputRef.current.value = '';
}
                },
                onError: () => setSendingComment(false),
            },
        );
    };

    const handleDeleteComment = (commentId: string) => {
        if (!confirm('Hapus komentar ini?')) {
return;
}

        router.delete(`/comments/${commentId}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleSaveEdit = (commentId: string) => {
        if (!editContent.replace(/<p><\/p>/g, '').trim()) {
return;
}

        router.put(
            `/comments/${commentId}`,
            {
                content: editContent,
                new_attachments: editAttachments,
                removed_media_ids: editRemovedMediaIds,
            },
            {
                preserveScroll: true,
                preserveState: true,
                forceFormData: true,
                onSuccess: () => {
                    setEditingCommentId(null);
                    setEditContent('');
                    setEditAttachments([]);
                    setEditRemovedMediaIds([]);
                },
            },
        );
    };

    const startEditing = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
        setEditAttachments([]);
        setEditRemovedMediaIds([]);
        setReplyingTo(null);
    };

    const comments = (
        task?.comments?.filter((c: any) => !c.parent_id) || []
    ).sort(
        (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const getReplies = (parentId: string) =>
        (
            task?.comments?.filter((c: any) => c.parent_id === parentId) || []
        ).sort(
            (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
        );
    const canDeleteComment = (c: any) =>
        c.user_id === auth?.user?.id || isGlobalAdmin;

    const isImage = (mime: string) => mime?.startsWith('image/');

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto lg:max-w-[1400px]">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Detail Tugas
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-1 flex flex-col gap-4">
                    {/* Tags */}
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            Tags
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {globalTags.map((tag: any) => {
                                const selected = selectedTagIds.includes(
                                    tag.id,
                                );

                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() =>
                                            canEditTask && toggleTag(tag.id)
                                        }
                                        className={`rounded-full px-3 py-0.5 text-xs font-semibold text-white transition-all ${canEditTask ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                        style={{
                                            backgroundColor: tag.color,
                                            opacity: selected ? 1 : 0.35,
                                            transform: selected
                                                ? 'scale(1.05)'
                                                : 'scale(1)',
                                            outline: selected
                                                ? `2px solid ${tag.color}`
                                                : 'none',
                                            outlineOffset: '2px',
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assignees */}
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            Anggota Tugas
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {team?.users?.map((user: any) => {
                                const selected = selectedAssigneeIds.includes(
                                    user.id,
                                );

                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                            if (
                                                canEditTask &&
                                                user.id !== task?.creator_id
                                            ) {
toggleAssignee(user.id);
}
                                        }}
                                        className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-all ${!canEditTask || user.id === task?.creator_id ? 'cursor-default opacity-80' : 'cursor-pointer hover:ring-1'} ${selected ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary ring-offset-1 dark:ring-offset-zinc-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700'}`}
                                        title={
                                            user.id === task?.creator_id
                                                ? 'Pembuat tugas tidak dapat diunselect'
                                                : ''
                                        }
                                    >
                                        <Avatar className="h-4 w-4 bg-white/20">
                                            <AvatarImage
                                                src={
                                                    user.avatar_url ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`
                                                }
                                            />
                                            <AvatarFallback className="text-[8px] text-slate-600 dark:text-slate-400">
                                                {user.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {user.name.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Judul
                        </label>
                        <Input
                            value={title}
                            readOnly={!canEditTask}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-base font-semibold"
                            placeholder="Judul tugas..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Deskripsi
                        </label>
                        <Textarea
                            value={description}
                            readOnly={!canEditTask}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Tambahkan deskripsi tugas..."
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Task Media */}
                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">
                                Lampiran Tugas
                            </label>
                            {canEditTask && (
                                <>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        ref={taskFileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files?.length) {
setTaskAttachments([
                                                    ...taskAttachments,
                                                    ...Array.from(
                                                        e.target.files,
                                                    ),
                                                ]);
}
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 p-0 text-xs text-primary"
                                        onClick={() =>
                                            taskFileInputRef.current?.click()
                                        }
                                    >
                                        + Tambah Lampiran
                                    </Button>
                                </>
                            )}
                        </div>

                        {taskAttachments.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {taskAttachments.map((f, i) => (
                                    <PendingFilePreview
                                        key={i}
                                        file={f}
                                        onRemove={() =>
                                            setTaskAttachments(
                                                taskAttachments.filter(
                                                    (_, idx) => idx !== i,
                                                ),
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        )}

                        {task?.media?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-4 rounded-lg border border-dashed border-sidebar-border bg-slate-50/50 p-3 dark:bg-zinc-800/20">
                                {task.media.map((m: any) => (
                                    <div key={m.id} className="group relative">
                                        {isImage(m.mime_type) ? (
                                            <a
                                                href={m.original_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block max-w-[200px] overflow-hidden rounded border shadow-sm transition hover:ring-2 hover:ring-primary/50"
                                            >
                                                <img
                                                    src={m.original_url}
                                                    alt={m.file_name}
                                                    className="h-auto w-full object-cover"
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={m.original_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex h-24 w-24 flex-col items-center justify-center rounded border bg-white p-3 shadow-sm transition hover:ring-2 hover:ring-primary/50 dark:bg-zinc-800"
                                            >
                                                <Paperclip className="mb-2 h-8 w-8 text-primary" />
                                                <span className="line-clamp-2 w-full text-center text-[10px] font-medium break-words">
                                                    {m.file_name}
                                                </span>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!task?.media?.length &&
                            taskAttachments.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                    Belum ada lampiran.
                                </span>
                            )}
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" /> Tenggat Waktu
                        </label>
                        <Input
                            type="date"
                            value={dueDate}
                            readOnly={!canEditTask}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-48 text-sm"
                        />
                    </div>

                    {/* Comments Section */}
                    <div className="mt-2 border-t border-sidebar-border/70 pt-4">
                        <label className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5" /> Komentar
                        </label>

                        {/* Hidden File Input for Comments */}
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    setAttachments([
                                        ...attachments,
                                        ...Array.from(e.target.files),
                                    ]);
                                }
                            }}
                        />

                        {/* Hidden File Input for Comment Edit */}
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

                        {/* Main Comment Form */}
                        {!replyingTo && (
                            <div className="mb-4 flex items-start gap-2">
                                <Avatar className="h-8 w-8 bg-white/20">
                                    <AvatarImage
                                        src={
                                            auth?.user?.avatar_url ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.user?.name || 'User')}`
                                        }
                                    />
                                    <AvatarFallback className="text-xs text-slate-600 dark:text-slate-400">
                                        {auth?.user?.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-1 flex-col gap-2">
                                    <RichTextEditor
                                        content={commentText}
                                        onChange={setCommentText}
                                        disabled={sendingComment}
                                        onSubmit={handleAddComment}
                                    />

                                    {attachments.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {attachments.map((file, i) => (
                                                <PendingFilePreview
                                                    key={i}
                                                    file={file}
                                                    onRemove={() =>
                                                        setAttachments(
                                                            attachments.filter(
                                                                (_, idx) =>
                                                                    idx !== i,
                                                            ),
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-1 flex items-center justify-between">
                                        <div className="actions flex">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="flex h-8 items-center gap-1 text-xs text-muted-foreground"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />{' '}
                                                Lampirkan File
                                            </Button>
                                        </div>
                                        <Button
                                            size="sm"
                                            disabled={
                                                sendingComment ||
                                                (!commentText
                                                    .replace(/<p><\/p>/g, '')
                                                    .trim() &&
                                                    attachments.length === 0)
                                            }
                                            onClick={handleAddComment}
                                            className="h-8 text-xs"
                                        >
                                            {sendingComment ? (
                                                <>
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                    Mengirim
                                                </>
                                            ) : (
                                                'Kirim Komentar'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex max-h-[300px] flex-col gap-4 overflow-y-auto pr-2">
                            {comments.length === 0 && (
                                <div className="rounded-lg border-2 border-dashed border-slate-200 py-4 text-center text-xs text-muted-foreground dark:border-slate-800">
                                    Belum ada komentar.
                                </div>
                            )}

                            {comments.map((comment: any) => (
                                <div
                                    key={comment.id}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex gap-3">
                                        <Avatar className="h-8 w-8 bg-white/20">
                                            <AvatarImage
                                                src={
                                                    comment.user?.avatar_url ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}`
                                                }
                                            />
                                            <AvatarFallback className="text-xs text-slate-600 dark:text-slate-400">
                                                {comment.user?.name?.charAt(
                                                    0,
                                                ) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/50">
                                            <div className="mb-1 flex items-start justify-between">
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {comment.user?.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(
                                                            comment.created_at,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                            {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}
                                                    </span>
                                                    {comment.user_id ===
                                                        auth?.user?.id && (
                                                        <button
                                                            onClick={() =>
                                                                startEditing(
                                                                    comment,
                                                                )
                                                            }
                                                            className="text-slate-400 transition hover:text-primary"
                                                            title="Edit komentar"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    {canDeleteComment(
                                                        comment,
                                                    ) && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteComment(
                                                                    comment.id,
                                                                )
                                                            }
                                                            className="text-red-400 transition hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {editingCommentId === comment.id ? (
                                                <div className="mt-1 flex flex-col gap-2">
                                                    <RichTextEditor
                                                        content={editContent}
                                                        onChange={
                                                            setEditContent
                                                        }
                                                        disabled={false}
                                                    />
                                                    {editAttachments.length >
                                                        0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {editAttachments.map(
                                                                (f, i) => (
                                                                    <PendingFilePreview
                                                                        key={i}
                                                                        file={
                                                                            f
                                                                        }
                                                                        onRemove={() =>
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
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                    {comment.media &&
                                                        comment.media.length >
                                                            0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {comment.media.map(
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
                                                                onClick={() => {
                                                                    setEditingCommentId(
                                                                        null,
                                                                    );
                                                                    setEditContent(
                                                                        '',
                                                                    );
                                                                    setEditAttachments(
                                                                        [],
                                                                    );
                                                                    setEditRemovedMediaIds(
                                                                        [],
                                                                    );
                                                                }}
                                                            >
                                                                Batal
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() =>
                                                                    handleSaveEdit(
                                                                        comment.id,
                                                                    )
                                                                }
                                                            >
                                                                Simpan
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-sm text-slate-700 dark:text-slate-300 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:m-0 [&_strong]:font-bold [&_ul]:list-disc"
                                                    dangerouslySetInnerHTML={{
                                                        __html: comment.content,
                                                    }}
                                                />
                                            )}
                                            {comment.media &&
                                                comment.media.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {comment.media.map(
                                                            (m: any) =>
                                                                isImage(
                                                                    m.mime_type,
                                                                ) ? (
                                                                    <a
                                                                        key={
                                                                            m.id
                                                                        }
                                                                        href={
                                                                            m.original_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="block h-24 w-24 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                                                    >
                                                                        <img
                                                                            src={
                                                                                m.original_url
                                                                            }
                                                                            className="h-full w-full object-cover"
                                                                            alt="attachment"
                                                                        />
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        key={
                                                                            m.id
                                                                        }
                                                                        href={
                                                                            m.original_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                                                    >
                                                                        <Paperclip className="h-3 w-3" />{' '}
                                                                        <span className="max-w-[120px] truncate">
                                                                            {
                                                                                m.file_name
                                                                            }
                                                                        </span>
                                                                    </a>
                                                                ),
                                                        )}
                                                    </div>
                                                )}
                                            <button
                                                onClick={() =>
                                                    setReplyingTo(
                                                        replyingTo ===
                                                            comment.id
                                                            ? null
                                                            : comment.id,
                                                    )
                                                }
                                                className="mt-2 flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition hover:text-primary"
                                            >
                                                <Reply className="h-3 w-3" />{' '}
                                                Balas
                                            </button>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {getReplies(comment.id).length > 0 && (
                                        <div className="ml-11 flex flex-col gap-2 border-l-2 border-slate-200 pl-4 dark:border-zinc-800">
                                            {getReplies(comment.id).map(
                                                (reply: any) => (
                                                    <div
                                                        key={reply.id}
                                                        className="flex gap-3"
                                                    >
                                                        <Avatar className="h-6 w-6 bg-white/20">
                                                            <AvatarImage
                                                                src={
                                                                    reply.user
                                                                        ?.avatar_url ||
                                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'User')}`
                                                                }
                                                            />
                                                            <AvatarFallback className="text-[10px] text-slate-600 dark:text-slate-400">
                                                                {reply.user?.name?.charAt(
                                                                    0,
                                                                ) || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 rounded-lg bg-slate-50 p-2.5 dark:bg-zinc-800/50">
                                                            <div className="mb-1 flex items-start justify-between">
                                                                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                                                    {
                                                                        reply
                                                                            .user
                                                                            ?.name
                                                                    }
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {new Date(
                                                                            reply.created_at,
                                                                        ).toLocaleDateString(
                                                                            'id-ID',
                                                                            {
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            },
                                                                        )}
                                                                    </span>
                                                                    {reply.user_id ===
                                                                        auth
                                                                            ?.user
                                                                            ?.id && (
                                                                        <button
                                                                            onClick={() =>
                                                                                startEditing(
                                                                                    reply,
                                                                                )
                                                                            }
                                                                            className="text-slate-400 transition hover:text-primary"
                                                                            title="Edit balasan"
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                    {canDeleteComment(
                                                                        reply,
                                                                    ) && (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleDeleteComment(
                                                                                    reply.id,
                                                                                )
                                                                            }
                                                                            className="text-red-400 transition hover:text-red-600"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {editingCommentId ===
                                                            reply.id ? (
                                                                <div className="mt-1 flex flex-col gap-2">
                                                                    <RichTextEditor
                                                                        content={
                                                                            editContent
                                                                        }
                                                                        onChange={
                                                                            setEditContent
                                                                        }
                                                                        disabled={
                                                                            false
                                                                        }
                                                                    />
                                                                    {editAttachments.length >
                                                                        0 && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {editAttachments.map(
                                                                                (
                                                                                    f,
                                                                                    i,
                                                                                ) => (
                                                                                    <PendingFilePreview
                                                                                        key={
                                                                                            i
                                                                                        }
                                                                                        file={
                                                                                            f
                                                                                        }
                                                                                        onRemove={() =>
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
                                                                                    />
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {reply.media &&
                                                                        reply
                                                                            .media
                                                                            .length >
                                                                            0 && (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {reply.media.map(
                                                                                    (
                                                                                        m: any,
                                                                                    ) =>
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
                                                                                onClick={() => {
                                                                                    setEditingCommentId(
                                                                                        null,
                                                                                    );
                                                                                    setEditContent(
                                                                                        '',
                                                                                    );
                                                                                    setEditAttachments(
                                                                                        [],
                                                                                    );
                                                                                    setEditRemovedMediaIds(
                                                                                        [],
                                                                                    );
                                                                                }}
                                                                            >
                                                                                Batal
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                className="h-6 text-xs"
                                                                                onClick={() =>
                                                                                    handleSaveEdit(
                                                                                        reply.id,
                                                                                    )
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
                                                            {reply.media &&
                                                                reply.media
                                                                    .length >
                                                                    0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {reply.media.map(
                                                                            (
                                                                                m: any,
                                                                            ) =>
                                                                                isImage(
                                                                                    m.mime_type,
                                                                                ) ? (
                                                                                    <a
                                                                                        key={
                                                                                            m.id
                                                                                        }
                                                                                        href={
                                                                                            m.original_url
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="block h-16 w-16 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                                                                    >
                                                                                        <img
                                                                                            src={
                                                                                                m.original_url
                                                                                            }
                                                                                            className="h-full w-full object-cover"
                                                                                            alt="attachment"
                                                                                        />
                                                                                    </a>
                                                                                ) : (
                                                                                    <a
                                                                                        key={
                                                                                            m.id
                                                                                        }
                                                                                        href={
                                                                                            m.original_url
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                                                                    >
                                                                                        <Paperclip className="h-3 w-3" />{' '}
                                                                                        <span className="max-w-[100px] truncate">
                                                                                            {
                                                                                                m.file_name
                                                                                            }
                                                                                        </span>
                                                                                    </a>
                                                                                ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {/* Reply Form */}
                                    {replyingTo === comment.id && (
                                        <div className="mt-2 ml-11 flex flex-col gap-2">
                                            <RichTextEditor
                                                content={commentText}
                                                onChange={setCommentText}
                                                disabled={sendingComment}
                                                onSubmit={handleAddComment}
                                            />

                                            {attachments.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {attachments.map(
                                                        (file, i) => (
                                                            <PendingFilePreview
                                                                key={i}
                                                                file={file}
                                                                onRemove={() =>
                                                                    setAttachments(
                                                                        attachments.filter(
                                                                            (
                                                                                _,
                                                                                idx,
                                                                            ) =>
                                                                                idx !==
                                                                                i,
                                                                        ),
                                                                    )
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-1 flex items-center justify-between">
                                                <div className="actions flex">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex h-8 items-center gap-1 text-xs text-muted-foreground"
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                    >
                                                        <Paperclip className="h-3.5 w-3.5" />{' '}
                                                        Lampirkan File
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs"
                                                        onClick={() => {
                                                            setReplyingTo(null);
                                                            setCommentText('');
                                                            setAttachments([]);
                                                        }}
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            sendingComment ||
                                                            (!commentText
                                                                .replace(
                                                                    /<p><\/p>/g,
                                                                    '',
                                                                )
                                                                .trim() &&
                                                                attachments.length ===
                                                                    0)
                                                        }
                                                        onClick={
                                                            handleAddComment
                                                        }
                                                        className="h-8 text-xs"
                                                    >
                                                        {sendingComment ? (
                                                            <>
                                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                Mengirim
                                                            </>
                                                        ) : (
                                                            'Kirim Balasan'
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-sidebar-border/70 pt-2">
                        {canEditTask ? (
                            <>
                                <div>
                                    {canDeleteTask && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleDelete}
                                            className="text-xs"
                                        >
                                            Hapus Tugas
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onClose}
                                        className="text-xs"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="text-xs"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            'Simpan'
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex w-full justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onClose}
                                    className="text-xs"
                                >
                                    Tutup
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
