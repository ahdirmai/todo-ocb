import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Loader2, MessageSquare, Reply, Trash2, X, Send, Paperclip, Bold, Italic, List, ListOrdered } from 'lucide-react';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';

const RichTextEditor = ({ content, onChange, disabled, onSubmit }: any) => {
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

    if (!editor) return null;

    return (
        <div className={`border rounded-lg border-input bg-background overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-1 p-1 border-b bg-muted/40 border-input">
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()}>
                    <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()}>
                    <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="w-3.5 h-3.5" />
                </Button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

interface TaskDetailModalProps {
    task: any | null;
    open: boolean;
    onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
    const { tags: globalTags = [], auth, team } = usePage<any>().props;

    const isGlobalAdmin = auth?.roles?.some((r: string) => ['superadmin', 'admin'].includes(r));
    const isTaskCreator = task?.creator_id === auth?.user?.id;
    const isTeamAdmin = team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role === 'admin';
    const isAssignee = task?.assignees?.some((a: any) => a.id === auth?.user?.id);
    const canModify = Boolean(isGlobalAdmin || isTaskCreator || isTeamAdmin || isAssignee);

    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        task?.tags?.map((t: any) => t.id) ?? []
    );
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
        task?.assignees?.map((a: any) => a.id) ?? []
    );
    const [saving, setSaving] = useState(false);

    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [sendingComment, setSendingComment] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const taskFileInputRef = useRef<HTMLInputElement>(null);

    // Realtime polling
    useEffect(() => {
        if (!open) return;
        const interval = setInterval(() => {
            router.reload({ only: ['team'], preserveScroll: true, preserveState: true });
        }, 5000);
        return () => clearInterval(interval);
    }, [open]);

    // Sync state when task changes
    if (task && task.title !== title && !saving) {
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(task.due_date?.split('T')[0] || '');
        setSelectedTagIds(task.tags?.map((t: any) => t.id) ?? []);
        setSelectedAssigneeIds(task.assignees?.map((a: any) => a.id) ?? []);
    }

    const toggleTag = (id: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    const toggleAssignee = (id: string) => {
        setSelectedAssigneeIds((prev) =>
            prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!task) return;
        setSaving(true);
        router.post(TaskActions.update.url(task.id), {
            _method: 'put',
            title,
            description,
            due_date: dueDate || undefined,
            tag_ids: selectedTagIds,
            assignee_ids: selectedAssigneeIds,
            attachments: taskAttachments,
        }, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setSaving(false);
                setTaskAttachments([]);
                if (taskFileInputRef.current) taskFileInputRef.current.value = '';
                onClose();
            },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        if (!task || !confirm(`Hapus task "${task.title}"?`)) return;
        router.delete(TaskActions.destroy.url(task.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const handleAddComment = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const cleanContent = commentText.replace(/<p><\/p>/g, '').trim();
        if ((!cleanContent && attachments.length === 0) || sendingComment || !task) return;

        setSendingComment(true);
        router.post(`/tasks/${task.id}/comments`, {
            content: cleanContent || '<p></p>',
            parent_id: replyingTo,
            attachments: attachments,
        }, {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            onSuccess: () => {
                setCommentText('');
                setAttachments([]);
                setReplyingTo(null);
                setSendingComment(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: () => setSendingComment(false),
        });
    };

    const handleDeleteComment = (commentId: string) => {
        if (!confirm('Hapus komentar ini?')) return;
        router.delete(`/comments/${commentId}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const comments = (task?.comments?.filter((c: any) => !c.parent_id) || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const getReplies = (parentId: string) => (task?.comments?.filter((c: any) => c.parent_id === parentId) || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const canDeleteComment = (c: any) => c.user_id === auth?.user?.id || isGlobalAdmin;

    const isImage = (mime: string) => mime?.startsWith('image/');

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-[95vw] lg:max-w-[1400px] w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Detail Tugas
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-1">
                    {/* Tags */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {globalTags.map((tag: any) => {
                                const selected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => canModify && toggleTag(tag.id)}
                                        className={`px-3 py-0.5 rounded-full text-xs font-semibold text-white transition-all ${canModify ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                        style={{
                                            backgroundColor: tag.color,
                                            opacity: selected ? 1 : 0.35,
                                            transform: selected ? 'scale(1.05)' : 'scale(1)',
                                            outline: selected ? `2px solid ${tag.color}` : 'none',
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
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Anggota Tugas</label>
                        <div className="flex flex-wrap gap-2">
                            {team?.users?.map((user: any) => {
                                const selected = selectedAssigneeIds.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                            if (canModify && user.id !== task?.creator_id) toggleAssignee(user.id);
                                        }}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${(!canModify || user.id === task?.creator_id) ? 'cursor-default opacity-80' : 'cursor-pointer hover:ring-1'} ${selected ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary ring-offset-1 dark:ring-offset-zinc-950' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                                        title={user.id === task?.creator_id ? "Pembuat tugas tidak dapat diunselect" : ""}
                                    >
                                        <Avatar className="w-4 h-4 bg-white/20">
                                            <AvatarImage src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} />
                                            <AvatarFallback className="text-[8px] text-slate-600 dark:text-slate-400">{user.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {user.name.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul</label>
                        <Input
                            value={title}
                            readOnly={!canModify}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-base font-semibold"
                            placeholder="Judul tugas..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
                        <Textarea
                            value={description}
                            readOnly={!canModify}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Tambahkan deskripsi tugas..."
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Task Media */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground">Lampiran Tugas</label>
                            {canModify && (
                                <>
                                    <input type="file" multiple className="hidden" ref={taskFileInputRef} onChange={(e) => {
                                        if (e.target.files?.length) setTaskAttachments([...taskAttachments, ...Array.from(e.target.files)]);
                                    }} />
                                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-primary p-0" onClick={() => taskFileInputRef.current?.click()}>
                                        + Tambah Lampiran
                                    </Button>
                                </>
                            )}
                        </div>

                        {taskAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {taskAttachments.map((f, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                                        <Paperclip className="w-3 h-3" /> {f.name}
                                        <button onClick={() => setTaskAttachments(taskAttachments.filter((_, idx) => idx !== i))} className="ml-1 text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {task?.media?.length > 0 && (
                            <div className="flex flex-wrap gap-4 mt-2 p-3 border border-dashed rounded-lg border-sidebar-border bg-slate-50/50 dark:bg-zinc-800/20">
                                {task.media.map((m: any) => (
                                    <div key={m.id} className="relative group">
                                        {isImage(m.mime_type) ? (
                                            <a href={m.original_url} target="_blank" rel="noreferrer" className="block max-w-[200px] rounded overflow-hidden border shadow-sm hover:ring-2 hover:ring-primary/50 transition">
                                                <img src={m.original_url} alt={m.file_name} className="w-full h-auto object-cover" />
                                            </a>
                                        ) : (
                                            <a href={m.original_url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 w-24 h-24 bg-white dark:bg-zinc-800 rounded border shadow-sm hover:ring-2 hover:ring-primary/50 transition">
                                                <Paperclip className="w-8 h-8 text-primary mb-2" />
                                                <span className="text-[10px] text-center font-medium line-clamp-2 w-full break-words">{m.file_name}</span>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!task?.media?.length && taskAttachments.length === 0 && <span className="text-xs text-muted-foreground">Belum ada lampiran.</span>}
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1 block">
                            <Calendar className="w-3.5 h-3.5" /> Tenggat Waktu
                        </label>
                        <Input
                            type="date"
                            value={dueDate}
                            readOnly={!canModify}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-48 text-sm"
                        />
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-sidebar-border/70 pt-4 mt-2">
                        <label className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Komentar
                        </label>

                        {/* Hidden File Input for Comments */}
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    setAttachments([...attachments, ...Array.from(e.target.files)]);
                                }
                            }}
                        />

                        {/* Main Comment Form */}
                        {!replyingTo && (
                            <div className="flex gap-2 items-start mb-4">
                                <Avatar className="w-8 h-8 bg-white/20">
                                    <AvatarImage src={auth?.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.user?.name || 'User')}`} />
                                    <AvatarFallback className="text-xs text-slate-600 dark:text-slate-400">{auth?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 flex flex-col gap-2">
                                    <RichTextEditor
                                        content={commentText}
                                        onChange={setCommentText}
                                        disabled={sendingComment}
                                        onSubmit={handleAddComment}
                                    />

                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {attachments.map((file, i) => (
                                                <span key={i} className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                                                    <Paperclip className="w-3 h-3" /> {file.name}
                                                    <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="ml-1 text-red-500 hover:text-red-700">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex actions">
                                            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground flex items-center gap-1" onClick={() => fileInputRef.current?.click()}>
                                                <Paperclip className="w-3.5 h-3.5" /> Lampirkan File
                                            </Button>
                                        </div>
                                        <Button size="sm" disabled={sendingComment || (!commentText.replace(/<p><\/p>/g, '').trim() && attachments.length === 0)} onClick={handleAddComment} className="text-xs h-8">
                                            {sendingComment ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Mengirim</> : 'Kirim Komentar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                            {comments.length === 0 && (
                                <div className="text-center text-xs text-muted-foreground py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">Belum ada komentar.</div>
                            )}

                            {comments.map((comment: any) => (
                                <div key={comment.id} className="flex flex-col gap-2">
                                    <div className="flex gap-3">
                                        <Avatar className="w-8 h-8 bg-white/20">
                                            <AvatarImage src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}`} />
                                            <AvatarFallback className="text-xs text-slate-600 dark:text-slate-400">{comment.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{comment.user?.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(comment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {canDeleteComment(comment) && (
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-400 hover:text-red-600 transition">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                            {comment.media && comment.media.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {comment.media.map((m: any) => (
                                                        isImage(m.mime_type) ? (
                                                            <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="block w-24 h-24 overflow-hidden rounded border border-slate-200 dark:border-slate-700 hover:ring-2 transition">
                                                                <img src={m.original_url} className="w-full h-full object-cover" alt="attachment" />
                                                            </a>
                                                        ) : (
                                                            <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline bg-primary/10 px-2 py-1 rounded">
                                                                <Paperclip className="w-3 h-3" /> <span className="max-w-[120px] truncate">{m.file_name}</span>
                                                            </a>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                            <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-[10px] font-medium text-muted-foreground hover:text-primary mt-2 flex items-center gap-1 transition">
                                                <Reply className="w-3 h-3" /> Balas
                                            </button>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {getReplies(comment.id).length > 0 && (
                                        <div className="flex flex-col gap-2 ml-11 border-l-2 border-slate-200 dark:border-zinc-800 pl-4">
                                            {getReplies(comment.id).map((reply: any) => (
                                                <div key={reply.id} className="flex gap-3">
                                                    <Avatar className="w-6 h-6 bg-white/20">
                                                        <AvatarImage src={reply.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'User')}`} />
                                                        <AvatarFallback className="text-[10px] text-slate-600 dark:text-slate-400">{reply.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-2.5">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{reply.user?.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {new Date(reply.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {canDeleteComment(reply) && (
                                                                    <button onClick={() => handleDeleteComment(reply.id)} className="text-red-400 hover:text-red-600 transition">
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-700 dark:text-slate-300 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0" dangerouslySetInnerHTML={{ __html: reply.content }} />
                                                        {reply.media && reply.media.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {reply.media.map((m: any) => (
                                                                    isImage(m.mime_type) ? (
                                                                        <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="block w-16 h-16 overflow-hidden rounded border border-slate-200 dark:border-slate-700 hover:ring-2 transition">
                                                                            <img src={m.original_url} className="w-full h-full object-cover" alt="attachment" />
                                                                        </a>
                                                                    ) : (
                                                                        <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline bg-primary/10 px-2 py-1 rounded">
                                                                            <Paperclip className="w-3 h-3" /> <span className="max-w-[100px] truncate">{m.file_name}</span>
                                                                        </a>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Form */}
                                    {replyingTo === comment.id && (
                                        <div className="ml-11 flex flex-col gap-2 mt-2">
                                            <RichTextEditor
                                                content={commentText}
                                                onChange={setCommentText}
                                                disabled={sendingComment}
                                                onSubmit={handleAddComment}
                                            />

                                            {attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {attachments.map((file, i) => (
                                                        <span key={i} className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                                                            <Paperclip className="w-3 h-3" /> {file.name}
                                                            <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="ml-1 text-red-500 hover:text-red-700">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mt-1">
                                                <div className="flex actions">
                                                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground flex items-center gap-1" onClick={() => fileInputRef.current?.click()}>
                                                        <Paperclip className="w-3.5 h-3.5" /> Lampirkan File
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { setReplyingTo(null); setCommentText(''); setAttachments([]); }}>
                                                        Batal
                                                    </Button>
                                                    <Button size="sm" disabled={sendingComment || (!commentText.replace(/<p><\/p>/g, '').trim() && attachments.length === 0)} onClick={handleAddComment} className="text-xs h-8">
                                                        {sendingComment ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Mengirim</> : 'Kirim Balasan'}
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
                    <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/70">
                        {canModify ? (
                            <>
                                <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
                                    Hapus Tugas
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                                        {saving
                                            ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Menyimpan...</>
                                            : 'Simpan'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-end w-full">
                                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Tutup</Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
