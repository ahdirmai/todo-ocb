import { useEffect, useRef, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, X, Download, Image as ImageIcon, FileText, Loader2, MessageSquare, Users } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface MessageUser {
    id: number;
    name: string;
    avatar_url: string | null;
}

interface Attachment {
    id: number;
    name: string;
    url: string;
    mime: string;
    size: number;
}

interface ChatMessage {
    id: string;
    body: string | null;
    created_at: string;
    user: MessageUser | null;
    attachments: Attachment[];
}

interface TeamUser {
    id: number;
    name: string;
    avatar_url: string | null;
    pivot?: { role: string };
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
    return mime.startsWith('image/');
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

/* ─── Sub-components ─────────────────────────────────────── */

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
    if (isImage(attachment.mime)) {
        return (
            <div className="mt-2 group relative inline-block rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-xs">
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="block max-h-60 w-auto object-cover rounded-xl"
                    loading="lazy"
                />
                <a
                    href={attachment.url}
                    download={attachment.name}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                    title="Unduh gambar"
                >
                    <Download className="w-5 h-5 text-white" />
                </a>
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            download={attachment.name}
            className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-colors max-w-xs group"
        >
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-[10px] opacity-60">{formatFileSize(attachment.size)}</p>
            </div>
            <Download className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
    );
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
    const hasBody = !!message.body?.trim();

    return (
        <div className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'} group`}>
            {/* Avatar */}
            {!isMine && (
                <Avatar className="w-8 h-8 shrink-0 mt-0.5 ring-2 ring-background">
                    <AvatarImage src={message.user?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {message.user ? getInitials(message.user.name) : '?'}
                    </AvatarFallback>
                </Avatar>
            )}

            <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Name + time */}
                {!isMine && message.user && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">
                        {message.user.name}
                    </span>
                )}

                {/* Bubble */}
                <div
                    className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMine
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 border border-sidebar-border/50 rounded-tl-sm'
                    }`}
                >
                    {hasBody && <p className="whitespace-pre-wrap break-words">{message.body}</p>}

                    {/* Attachments */}
                    {message.attachments.map((att) => (
                        <AttachmentPreview key={att.id} attachment={att} />
                    ))}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(message.created_at)}
                </span>
            </div>
        </div>
    );
}

function MemberSidebar({ team }: { team: any }) {
    const members: TeamUser[] = team.users ?? [];

    return (
        <aside className="w-60 shrink-0 border-l border-sidebar-border/70 flex flex-col bg-slate-50/50 dark:bg-zinc-900/30">
            <div className="px-4 py-3 border-b border-sidebar-border/50">
                <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Anggota ({members.length})
                    </span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
                {members.map((user) => {
                    const role = user.pivot?.role ?? 'member';
                    return (
                        <div key={user.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100/60 dark:hover:bg-zinc-800/50 transition-colors rounded-lg mx-1">
                            <div className="relative shrink-0">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-none">{user.name}</p>
                                <Badge
                                    className={`mt-1 text-[9px] px-1.5 py-0 border-none leading-none h-4 ${
                                        role === 'admin'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400'
                                    }`}
                                >
                                    {role === 'admin' ? 'Admin' : 'Member'}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

/* ─── Main Component ─────────────────────────────────────── */

export function ChatTab({ team }: { team: any }) {
    const { auth, messages: initialMessages } = usePage<any>().props;
    const currentUserId: number = auth?.user?.id;

    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /* Auto-scroll to bottom on new messages */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* Laravel Echo subscription to private team channel */
    useEffect(() => {
        const echoInstance = (window as any).Echo;
        if (!echoInstance) {
            console.warn('[Chat] window.Echo tidak tersedia.');
            return;
        }

        const channel = echoInstance.private(`team.${team.id}`);

        channel
            .listen('.TeamMessageSent', (e: { message: ChatMessage }) => {
                setMessages((prev) => {
                    // Avoid duplicate (our own optimistic message)
                    if (prev.some((m) => m.id === e.message.id)) return prev;
                    return [...prev, e.message];
                });
            })
            .subscribed(() => setConnected(true))
            .error(() => setConnected(false));

        return () => {
            echoInstance.leave(`team.${team.id}`);
            setConnected(false);
        };
    }, [team.id]);

    /* Send message */
    const sendMessage = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed && !file) return;
        if (sending) return;

        setSending(true);

        const formData = new FormData();
        if (trimmed) formData.append('body', trimmed);
        if (file) formData.append('attachment', file);

        // Get CSRF token from meta tag
        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        const echoInstance = (window as any).Echo;
        const socketId = echoInstance ? echoInstance.socketId() : '';

        try {
            const res = await fetch(`/teams/${team.id}/messages`, {
                method: 'POST',
                headers: { 
                    'X-CSRF-TOKEN': csrfToken, 
                    'Accept': 'application/json',
                    ...(socketId ? { 'X-Socket-ID': socketId } : {})
                },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('[Chat] send error', err);
                return;
            }

            const newMsg: ChatMessage = await res.json();

            // Optimistic: add immediately (dedup handled in Echo listener)
            setMessages((prev) => [...prev, newMsg]);
            setText('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    }, [text, file, sending, team.id]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null);
    };

    /* Group messages: show date separator when day changes */
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            const dateStr = new Date(msg.created_at).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });

            if (dateStr !== lastDate) {
                lastDate = dateStr;
                elements.push(
                    <div key={`sep-${msg.id}`} className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-sidebar-border/50" />
                        <span className="text-[10px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-sidebar-border/50 shrink-0">
                            {dateStr}
                        </span>
                        <div className="flex-1 h-px bg-sidebar-border/50" />
                    </div>,
                );
            }

            elements.push(
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.user?.id === currentUserId}
                />,
            );
        });

        return elements;
    };

    return (
        <div className="flex h-full w-full max-h-[calc(100vh-14rem)] min-h-[400px] overflow-hidden">
            {/* ── Chat Panel ──────────────────────────────────── */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border/70 bg-white/50 dark:bg-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">
                                {team.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {team.users?.length ?? 0} anggota
                            </p>
                        </div>
                    </div>
                    {/* Connection indicator */}
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-zinc-600'}`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                            {connected ? 'Live' : 'Menghubungkan...'}
                        </span>
                    </div>
                </div>

                {/* Message list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="w-7 h-7 text-primary/60" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Belum ada pesan
                            </p>
                            <p className="text-xs text-muted-foreground max-w-52">
                                Jadilah yang pertama memulai percakapan di tim ini!
                            </p>
                        </div>
                    ) : (
                        renderMessages()
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* File preview strip */}
                {file && (
                    <div className="px-5 py-2 border-t border-sidebar-border/50 bg-slate-50/80 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-sidebar-border/50 rounded-xl px-3 py-2 max-w-xs">
                            {isImage(file.type) ? (
                                <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                                {file.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatFileSize(file.size)}
                            </span>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="shrink-0 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                title="Hapus lampiran"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="px-5 py-4 border-t border-sidebar-border/70 bg-white/50 dark:bg-zinc-900/50 shrink-0">
                    <div className="flex items-end gap-2">
                        {/* Attach file button */}
                        <button
                            id="chat-attach-btn"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="shrink-0 w-9 h-9 rounded-xl border border-sidebar-border/70 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors"
                            title="Lampirkan file"
                        >
                            <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="chat-file-input"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                        />

                        {/* Textarea */}
                        <Textarea
                            ref={textareaRef}
                            id="chat-message-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ketik pesan... (Enter kirim, Shift+Enter baris baru)"
                            className="flex-1 min-h-[40px] max-h-32 resize-none text-sm rounded-xl border-sidebar-border/70 focus:border-primary/50 bg-white dark:bg-zinc-800 py-2.5 px-3.5 leading-relaxed"
                            rows={1}
                        />

                        {/* Send button */}
                        <Button
                            id="chat-send-btn"
                            type="button"
                            onClick={sendMessage}
                            disabled={sending || (!text.trim() && !file)}
                            size="sm"
                            className="shrink-0 w-9 h-9 p-0 rounded-xl"
                            title="Kirim pesan"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Member Sidebar ───────────────────────────────── */}
            <MemberSidebar team={team} />
        </div>
    );
}
