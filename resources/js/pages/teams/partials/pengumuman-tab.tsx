import React, { useState, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare, MoreHorizontal, Paperclip, Pencil, Reply, Send, Trash2, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RichTextEditor } from '@/components/rich-text-editor';

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
    return mime?.startsWith('image/');
}

function getInitials(name: string) {
    return name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'U';
}

function CommentItem({ comment, team, auth, onReply }: any) {
    const isGlobalAdmin = auth?.roles?.some((r: string) => ['superadmin', 'admin'].includes(r));
    const canDelete = comment.user_id === auth?.user?.id || isGlobalAdmin;

    const handleDelete = () => {
        if (!confirm('Hapus komentar ini?')) return;
        router.delete(`/comments/${comment.id}`, { preserveScroll: true });
    };

    return (
        <div className="flex gap-3 mb-3">
            <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={comment.user?.avatar_url} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(comment.user?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{comment.user?.name}</span>
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                        <span>{new Date(comment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {canDelete && (
                            <button onClick={handleDelete} className="hover:text-red-500 transition-colors" title="Hapus komentar">
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
                
                <button onClick={() => onReply(comment.id)} className="text-[11px] font-medium text-muted-foreground hover:text-primary mt-2 flex items-center gap-1 transition">
                    <Reply className="w-3 h-3" /> Balas
                </button>

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                        {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                                <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                                    <AvatarImage src={reply.user?.avatar_url} />
                                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitials(reply.user?.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{reply.user?.name}</span>
                                        <div className="flex items-center gap-2 text-muted-foreground text-[9px]">
                                            <span>{new Date(reply.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                            {(reply.user_id === auth?.user?.id || isGlobalAdmin) && (
                                                <button onClick={() => {
                                                    if (confirm('Hapus balasan ini?')) router.delete(`/comments/${reply.id}`, { preserveScroll: true });
                                                }} className="hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-700 dark:text-slate-300 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0" dangerouslySetInnerHTML={{ __html: reply.content }} />
                                    {reply.media && reply.media.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-2">
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
            </div>
        </div>
    );
}

function AnnouncementItem({ announcement, team, auth }: any) {
    const isGlobalAdmin = auth?.roles?.some((r: string) => ['superadmin', 'admin'].includes(r));
    const isTeamAdmin = team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role === 'admin';
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
            router.delete(`/announcements/${announcement.id}`, { preserveScroll: true });
        }
    };

    const handleSaveEdit = () => {
        setSaving(true);
        router.put(`/announcements/${announcement.id}`, {
            title: editTitle,
            content: editContent,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                setIsEditing(false);
            },
            onError: () => setSaving(false),
        });
    };

    const handleComment = () => {
        const cleanContent = commentContent.replace(/<p><\/p>/g, '').trim();
        if ((!cleanContent && attachments.length === 0) || sending) return;

        setSending(true);
        router.post(`/announcements/${announcement.id}/comments`, {
            content: cleanContent || '<p></p>',
            parent_id: replyingTo,
            attachments: attachments,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSending(false);
                setCommentContent('');
                setAttachments([]);
                setReplyingTo(null);
                if (fileRef.current) fileRef.current.value = '';
            },
            onError: () => setSending(false),
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-2xl p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={announcement.user?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(announcement.user?.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{announcement.user?.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                            {new Date(announcement.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
                {canEditDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-muted-foreground">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => { setIsEditing(true); setEditTitle(announcement.title || ''); setEditContent(announcement.content || ''); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Pengumuman
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content body */}
            {isEditing ? (
                <div className="space-y-3 mb-4 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Judul Pengumuman (Opsional)" className="font-semibold" />
                    <RichTextEditor content={editContent} onChange={setEditContent} users={team?.users} disabled={saving} />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Batal</Button>
                        <Button size="sm" disabled={saving} onClick={handleSaveEdit}>
                            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5"/>Menyimpan</> : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    {announcement.title && (
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{announcement.title}</h3>
                    )}
                    <div className="text-sm text-slate-800 dark:text-slate-200 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: announcement.content }} />
                    
                    {/* Media render */}
                    {announcement.media && announcement.media.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {announcement.media.map((m: any) => (
                                isImage(m.mime_type) ? (
                                    <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="block max-w-[300px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
                                        <img src={m.original_url} className="w-full h-auto" alt={m.file_name} />
                                    </a>
                                ) : (
                                    <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700/80 transition min-w-[200px]">
                                        <div className="bg-primary/10 p-2 rounded-md"><Paperclip className="w-4 h-4 text-primary" /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{m.file_name}</div>
                                            <div className="text-[10px] text-muted-foreground">{formatFileSize(m.size)}</div>
                                        </div>
                                    </a>
                                )
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Comments List */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-4">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <MessageSquare className="w-4 h-4" /> {announcement.comments?.length || 0} Komentar
                </div>
                
                {announcement.comments?.filter((c: any) => !c.parent_id).map((comment: any) => (
                    <CommentItem key={comment.id} comment={comment} team={team} auth={auth} onReply={setReplyingTo} />
                ))}

                {/* Comment Form */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 text-sm">
                    <Avatar className="w-8 h-8 shrink-0 hidden sm:block">
                        <AvatarImage src={auth?.user?.avatar_url} />
                        <AvatarFallback>{getInitials(auth?.user?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex flex-col gap-2 relative">
                        {replyingTo && (
                            <div className="flex justify-between items-center text-[11px] text-muted-foreground bg-slate-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-md border border-slate-200 dark:border-zinc-700/50 -mb-1">
                                <span>Membalas komentar...</span>
                                <button onClick={() => setReplyingTo(null)} className="hover:text-slate-900 dark:hover:text-slate-100"><X className="w-3.5 h-3.5"/></button>
                            </div>
                        )}
                        <RichTextEditor 
                            content={commentContent} 
                            onChange={setCommentContent} 
                            users={team?.users} 
                            disabled={sending} 
                            placeholder={replyingTo ? "Tulis balasan... ketik @ untuk tag anggota" : "Tulis komentar... ketik @ untuk tag anggota"} 
                            minHeight="min-h-[40px]"
                        />

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((f, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-200 dark:border-zinc-700">
                                        <Paperclip className="w-3 h-3" /> <span className="max-w-[100px] truncate">{f.name}</span>
                                        <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="ml-1 text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-1">
                            <input type="file" ref={fileRef} multiple className="hidden" onChange={(e) => {
                                if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
                            }} />
                            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => fileRef.current?.click()} type="button">
                                <Paperclip className="w-3.5 h-3.5 mr-1" /> Lampirkan file
                            </Button>
                            
                            <Button size="sm" className="h-8" disabled={sending || (!commentContent.replace(/<p><\/p>/g, '').trim() && attachments.length === 0)} onClick={handleComment}>
                                {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Mengirim</> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Kirim</>}
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
        if (!cleanContent) return;

        setCreating(true);
        router.post(`/teams/${team.id}/announcements`, {
            title,
            content: cleanContent,
            attachments,
        }, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setCreating(false);
                setTitle('');
                setContent('');
                setAttachments([]);
                setShowForm(false);
                if (fileRef.current) fileRef.current.value = '';
            },
            onError: () => setCreating(false),
        });
    };

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full">
                
                {/* Form Bikin Pengumuman Baru */}
                {!showForm ? (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between cursor-text hover:border-sidebar-border transition-colors group" onClick={() => setShowForm(true)}>
                        <div className="flex items-center gap-3 w-full">
                            <Avatar className="w-9 h-9 shrink-0">
                                <AvatarImage src={auth?.user?.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(auth?.user?.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground text-sm flex-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Buat pengumuman baru untuk tim...</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 dark:border-primary/30 rounded-2xl p-5 mb-8 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Buat Pengumuman</h3>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:bg-slate-100" onClick={() => setShowForm(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <Input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                placeholder="Judul (Opsional)" 
                                className="font-semibold text-md border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 placeholder:font-normal"
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
                                        <span key={i} className="text-xs bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700">
                                            <Paperclip className="w-3.5 h-3.5 text-primary" /> <span className="max-w-[150px] truncate">{f.name}</span>
                                            <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="ml-1 text-red-500 hover:text-red-700"><X className="w-3.5 h-3.5" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <input type="file" ref={fileRef} multiple className="hidden" onChange={(e) => {
                                    if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
                                }} />
                                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} type="button" className="gap-2">
                                    <Paperclip className="w-4 h-4" /> Lampirkan file
                                </Button>
                                
                                <Button size="sm" disabled={creating || !content.replace(/<p><\/p>/g, '').trim()} onClick={handleCreate} className="px-6">
                                    {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Posting</> : 'Posting Pengumuman'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Pengumuman */}
                {!announcements || announcements.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/20">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">Belum ada pengumuman</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Gunakan fitur ini untuk membagikan informasi penting, update proyek, atau pembaruan kepada seluruh anggota tim.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {announcements.data.map((announcement: any) => (
                            <AnnouncementItem key={announcement.id} announcement={announcement} team={team} auth={auth} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
