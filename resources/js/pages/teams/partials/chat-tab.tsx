import { usePage } from '@inertiajs/react';
import {
    Paperclip,
    Send,
    X,
    Download,
    Image as ImageIcon,
    FileText,
    Loader2,
    MessageSquare,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { getEcho } from '@/echo';

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

    if (diffMin < 1) {
return 'baru saja';
}

    if (diffMin < 60) {
return `${diffMin} mnt lalu`;
}

    const diffH = Math.floor(diffMin / 60);

    if (diffH < 24) {
return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
}

    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
return `${bytes} B`;
}

    if (bytes < 1024 * 1024) {
return `${(bytes / 1024).toFixed(1)} KB`;
}

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
            <div className="group relative mt-2 inline-block max-w-xs overflow-hidden rounded-xl border border-white/20 shadow-sm">
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="block max-h-60 w-auto rounded-xl object-cover"
                    loading="lazy"
                />
                <a
                    href={attachment.url}
                    download={attachment.name}
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Unduh gambar"
                >
                    <Download className="h-5 w-5 text-white" />
                </a>
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            download={attachment.name}
            className="group mt-2 flex max-w-xs items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/20"
        >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                    {attachment.name}
                </p>
                <p className="text-[10px] opacity-60">
                    {formatFileSize(attachment.size)}
                </p>
            </div>
            <Download className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
    );
}

function MessageBubble({
    message,
    isMine,
}: {
    message: ChatMessage;
    isMine: boolean;
}) {
    const hasBody = !!message.body?.trim();

    return (
        <div
            className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'} group`}
        >
            {/* Avatar */}
            {!isMine && (
                <Avatar className="mt-0.5 h-8 w-8 shrink-0 ring-2 ring-background">
                    <AvatarImage
                        src={message.user?.avatar_url ?? undefined}
                        className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {message.user ? getInitials(message.user.name) : '?'}
                    </AvatarFallback>
                </Avatar>
            )}

            <div
                className={`flex max-w-[70%] flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
                {/* Name + time */}
                {!isMine && message.user && (
                    <span className="mb-1 px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {message.user.name}
                    </span>
                )}

                {/* Bubble */}
                <div
                    className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isMine
                            ? 'rounded-tr-sm bg-primary text-primary-foreground'
                            : 'rounded-tl-sm border border-sidebar-border/50 bg-white text-slate-900 dark:bg-zinc-800 dark:text-slate-100'
                    }`}
                >
                    {hasBody && (
                        <p className="break-words whitespace-pre-wrap">
                            {message.body}
                        </p>
                    )}

                    {/* Attachments */}
                    {message.attachments.map((att) => (
                        <AttachmentPreview key={att.id} attachment={att} />
                    ))}
                </div>

                {/* Timestamp */}
                <span className="mt-1 px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {formatTime(message.created_at)}
                </span>
            </div>
        </div>
    );
}

function MemberList({ team }: { team: any }) {
    const members: TeamUser[] = team.users ?? [];

    return (
        <div className="flex-1 overflow-y-auto py-2">
            {members.map((user) => {
                const role = user.pivot?.role ?? 'member';

                return (
                    <div
                        key={user.id}
                        className="mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-slate-100/60 dark:hover:bg-zinc-800/50"
                    >
                        <div className="relative shrink-0">
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={user.avatar_url ?? undefined}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs leading-none font-medium text-slate-800 dark:text-slate-200">
                                {user.name}
                            </p>
                            <Badge
                                className={`mt-1 h-4 border-none px-1.5 py-0 text-[9px] leading-none ${
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
    );
}

function MemberSidebar({ team }: { team: any }) {
    const members: TeamUser[] = team.users ?? [];

    return (
        <aside className="hidden w-60 shrink-0 flex-col border-l border-sidebar-border/70 bg-slate-50/50 md:flex dark:bg-zinc-900/30">
            <div className="border-b border-sidebar-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Anggota ({members.length})
                    </span>
                </div>
            </div>
            <MemberList team={team} />
        </aside>
    );
}

/* ─── Main Component ─────────────────────────────────────── */

export function ChatTab({ team }: { team: any }) {
    const { auth, messages: initialMessages } = usePage<any>().props;
    const currentUserId: number = auth?.user?.id;

    const [messages, setMessages] = useState<ChatMessage[]>(
        initialMessages ?? [],
    );
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);
    const [memberSheetOpen, setMemberSheetOpen] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /* Auto-scroll to bottom on new messages */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* Laravel Echo subscription to private team channel */
    useEffect(() => {
        const echoInstance = getEcho();

        if (!echoInstance) {
            console.warn('[Chat] window.Echo tidak tersedia.');

            return;
        }

        const channel = echoInstance.private(`team.${team.id}`);

        channel
            .listen('.TeamMessageSent', (e: { message: ChatMessage }) => {
                setMessages((prev) => {
                    // Avoid duplicate (our own optimistic message)
                    if (prev.some((m) => m.id === e.message.id)) {
return prev;
}

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

        if (!trimmed && files.length === 0) {
return;
}

        if (sending) {
return;
}

        setSending(true);

        const formData = new FormData();

        if (trimmed) {
formData.append('body', trimmed);
}

        files.forEach((f, i) => {
            formData.append(`attachments[${i}]`, f);
        });

        // Get CSRF token from meta tag
        const csrfToken =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement
            )?.content ?? '';

        const echoInstance = getEcho();
        const socketId = echoInstance ? echoInstance.socketId() : '';

        try {
            const res = await fetch(`/teams/${team.id}/messages`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                    ...(socketId ? { 'X-Socket-ID': socketId } : {}),
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
            setFiles([]);

            if (fileInputRef.current) {
fileInputRef.current.value = '';
}
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    }, [text, files, sending, team.id]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    /* Group messages: show date separator when day changes */
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            const dateStr = new Date(msg.created_at).toLocaleDateString(
                'id-ID',
                {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                },
            );

            if (dateStr !== lastDate) {
                lastDate = dateStr;
                elements.push(
                    <div
                        key={`sep-${msg.id}`}
                        className="my-4 flex items-center gap-3"
                    >
                        <div className="h-px flex-1 bg-sidebar-border/50" />
                        <span className="shrink-0 rounded-full border border-sidebar-border/50 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {dateStr}
                        </span>
                        <div className="h-px flex-1 bg-sidebar-border/50" />
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
        <div className="flex h-full max-h-[calc(100vh-14rem)] min-h-[400px] w-full overflow-hidden">
            {/* ── Chat Panel ──────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/70 bg-white/50 px-5 py-3 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                            <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm leading-none font-semibold text-slate-900 dark:text-slate-100">
                                {team.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {team.users?.length ?? 0} anggota
                            </p>
                        </div>
                    </div>
                    {/* Connection indicator + mobile member toggle */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-slate-300 dark:bg-zinc-600'}`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                                {connected ? 'Live' : 'Menghubungkan...'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMemberSheetOpen(true)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border/70 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary md:hidden"
                            title="Lihat anggota"
                        >
                            <Users className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Message list */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                                <MessageSquare className="h-7 w-7 text-primary/60" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Belum ada pesan
                            </p>
                            <p className="max-w-52 text-xs text-muted-foreground">
                                Jadilah yang pertama memulai percakapan di tim
                                ini!
                            </p>
                        </div>
                    ) : (
                        renderMessages()
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* File preview strip */}
                {files.length > 0 && (
                    <div className="border-t border-sidebar-border/50 bg-slate-50/80 px-5 py-2 dark:bg-zinc-900/50">
                        <div className="flex flex-col gap-1.5">
                            {files.map((f, i) => (
                                <div
                                    key={i}
                                    className="flex max-w-xs items-center gap-2 rounded-xl border border-sidebar-border/50 bg-white px-3 py-2 dark:bg-zinc-800"
                                >
                                    {isImage(f.type) ? (
                                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="flex-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                                        {f.name}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {formatFileSize(f.size)}
                                    </span>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-700 dark:hover:text-slate-200"
                                        title="Hapus lampiran"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="shrink-0 border-t border-sidebar-border/70 bg-white/50 px-5 py-4 dark:bg-zinc-900/50">
                    <div className="flex items-end gap-2">
                        {/* Attach file button */}
                        <button
                            id="chat-attach-btn"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                            title="Lampirkan file"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="chat-file-input"
                            className="sr-only"
                            multiple
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
                            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border-sidebar-border/70 bg-white px-3.5 py-2.5 text-sm leading-relaxed focus:border-primary/50 dark:bg-zinc-800"
                            rows={1}
                        />

                        {/* Send button */}
                        <Button
                            id="chat-send-btn"
                            type="button"
                            onClick={sendMessage}
                            disabled={sending || (!text.trim() && files.length === 0)}
                            size="sm"
                            className="h-9 w-9 shrink-0 rounded-xl p-0"
                            title="Kirim pesan"
                        >
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Member Sidebar (desktop) ──────────────────── */}
            <MemberSidebar team={team} />

            {/* ── Member Sheet (mobile) ──────────────────────── */}
            <Sheet open={memberSheetOpen} onOpenChange={setMemberSheetOpen}>
                <SheetContent side="right" className="w-72 p-0">
                    <SheetHeader className="border-b border-sidebar-border/50 px-4 py-3">
                        <SheetTitle className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Anggota ({team.users?.length ?? 0})
                        </SheetTitle>
                    </SheetHeader>
                    <MemberList team={team} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
