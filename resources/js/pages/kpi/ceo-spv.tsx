import CeoLayout from '@/layouts/ceo-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { CameraCapture } from '@/components/camera-capture';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Building2,
    Users,
    CheckCircle2,
    Circle,
    Paperclip,
    MessageSquare,
    X,
    Loader2,
    Send,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface TaskMedia {
    id: number;
    file_name: string;
    mime_type: string;
    original_url: string;
}

interface TaskComment {
    id: string;
    content: string;
    created_at: string;
    parent_id: string | null;
    user: { id: number; name: string } | null;
    sop_step: { sequence_order: number; name: string } | null;
    media: TaskMedia[];
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    visit_date: string | null;
    due_date: string | null;
    is_verified: boolean;
    is_done: boolean;
    store: { id: string; name: string; branch_code: string } | null;
    creator: { id: number; name: string } | null;
    assignees: Array<{ id: number; name: string }>;
    column_name: string | null;
    media: TaskMedia[];
    comments: TaskComment[];
}

interface Member {
    id: number;
    name: string;
    email: string;
    job_position: { name: string } | null;
    tasks: Task[];
    total_tasks: number;
    completed_tasks: number;
}

interface Props {
    date: string;
    spvTeam: { id: string; name: string } | null;
    members: Member[];
    totalTasksToday: number;
    completedTasksToday: number;
}

function CompletionBar({ value }: { value: number }) {
    const color = value >= 80 ? 'bg-green-600' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
        </div>
    );
}

function isImage(mime: string) {
    return mime?.startsWith('image/');
}

function MediaGrid({ media }: { media: TaskMedia[] }) {
    if (!media.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {media.map((m) =>
                isImage(m.mime_type) ? (
                    <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer"
                        className="block h-20 w-20 overflow-hidden rounded border border-slate-200 transition hover:ring-2 hover:ring-primary/50 dark:border-slate-700">
                        <img src={m.original_url} alt={m.file_name} className="h-full w-full object-cover" />
                    </a>
                ) : (
                    <a key={m.id} href={m.original_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline">
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">{m.file_name}</span>
                    </a>
                ),
            )}
        </div>
    );
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
    const [commentText, setCommentText] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const topComments = task.comments
        .filter((c) => !c.parent_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const getReplies = (parentId: string) =>
        task.comments
            .filter((c) => c.parent_id === parentId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });

    const handleSubmitComment = () => {
        if ((!commentText.trim() && attachments.length === 0) || sending) return;

        setSending(true);
        router.post(
            `/tasks/${task.id}/comments`,
            {
                content: commentText.trim() ? `<p>${commentText.trim()}</p>` : '<p></p>',
                parent_id: null,
                attachments,
                attachment_dates: attachments.map((f) => new Date(f.lastModified).toISOString()),
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setCommentText('');
                    setAttachments([]);
                    setSending(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    router.reload({ only: ['members'] });
                },
                onError: (errors: any) => {
                    setSending(false);
                    if (errors.attachments) toast.error(errors.attachments);
                },
            },
        );
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold leading-tight pr-6">
                        {task.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-1">
                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {task.store && <span>🏪 {task.store.branch_code} — {task.store.name}</span>}
                        {task.visit_date && (
                            <span>
                                📅{' '}
                                {new Date(task.visit_date + 'T00:00:00').toLocaleDateString('id-ID', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </span>
                        )}
                        {task.column_name && <span>📋 {task.column_name}</span>}
                        {task.assignees.length > 0 && (
                            <span>👥 {task.assignees.map((a) => a.name).join(', ')}</span>
                        )}
                    </div>

                    {/* Status */}
                    <div>
                        {task.is_verified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Terverifikasi
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 gap-1">
                                <Circle className="h-3 w-3" /> Belum Selesai
                            </Badge>
                        )}
                    </div>

                    {/* Description */}
                    {task.description && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Deskripsi</p>
                            <div
                                className="text-sm text-slate-700 dark:text-slate-300 rounded-lg border bg-slate-50/50 dark:bg-zinc-800/20 px-3 py-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                        </div>
                    )}

                    {/* Task attachments */}
                    {task.media.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                Lampiran Task ({task.media.length})
                            </p>
                            <div className="rounded-lg border border-dashed bg-slate-50/50 dark:bg-zinc-800/20 p-3">
                                <MediaGrid media={task.media} />
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Komentar ({task.comments.length})
                        </p>

                        {/* Comment list */}
                        {topComments.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-slate-200 py-4 text-center text-xs text-muted-foreground dark:border-slate-800 mb-4">
                                Belum ada komentar.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 mb-4">
                                {topComments.map((comment) => (
                                    <div key={comment.id} className="space-y-2">
                                        <div className="flex gap-2">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className="text-[10px]">
                                                    {comment.user?.name?.charAt(0) ?? '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 rounded-xl bg-slate-50 dark:bg-zinc-800/50 px-3 py-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        {comment.user?.name ?? 'Anonim'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDate(comment.created_at)}
                                                    </span>
                                                </div>
                                                <div
                                                    className="text-sm text-slate-700 dark:text-slate-300 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0"
                                                    dangerouslySetInnerHTML={{ __html: comment.content }}
                                                />
                                                {comment.sop_step && (
                                                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                        SOP {comment.sop_step.sequence_order}. {comment.sop_step.name}
                                                    </span>
                                                )}
                                                <MediaGrid media={comment.media} />
                                            </div>
                                        </div>

                                        {/* Replies */}
                                        {getReplies(comment.id).length > 0 && (
                                            <div className="ml-9 space-y-2 border-l-2 border-slate-200 dark:border-zinc-700 pl-3">
                                                {getReplies(comment.id).map((reply) => (
                                                    <div key={reply.id} className="flex gap-2">
                                                        <Avatar className="h-6 w-6 shrink-0">
                                                            <AvatarFallback className="text-[9px]">
                                                                {reply.user?.name?.charAt(0) ?? '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 rounded-lg bg-slate-50 dark:bg-zinc-800/50 px-2.5 py-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                                                    {reply.user?.name ?? 'Anonim'}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {formatDate(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="text-xs text-slate-700 dark:text-slate-300 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0"
                                                                dangerouslySetInnerHTML={{ __html: reply.content }}
                                                            />
                                                            {reply.sop_step && (
                                                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                                    SOP {reply.sop_step.sequence_order}. {reply.sop_step.name}
                                                                </span>
                                                            )}
                                                            <MediaGrid media={reply.media} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add comment form */}
                        <div className="space-y-2 border rounded-lg p-3 bg-slate-50/50 dark:bg-zinc-800/20">
                            <Textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Tulis komentar..."
                                rows={3}
                                className="resize-none text-sm bg-background"
                                disabled={sending}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        handleSubmitComment();
                                    }
                                }}
                            />

                            {/* Pending attachments */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                                            <Paperclip className="h-3 w-3" />
                                            <span className="max-w-[120px] truncate">{f.name}</span>
                                            <button
                                                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                                className="ml-1 text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <CameraCapture
                                    onCapture={(files) => {
                                        setAttachments((prev) => [...prev, ...files]);
                                    }}
                                    currentCount={attachments.length}
                                    label="Ambil Foto"
                                    disabled={sending}
                                />
                                <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={handleSubmitComment}
                                    disabled={sending || (!commentText.trim() && attachments.length === 0)}
                                >
                                    {sending ? (
                                        <><Loader2 className="h-3 w-3 animate-spin" /> Mengirim</>
                                    ) : (
                                        <><Send className="h-3 w-3" /> Kirim</>
                                    )}
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Ctrl+Enter untuk kirim cepat.</p>
                        </div>
                    </div>

                    <div className="flex justify-end border-t pt-3">
                        <Button variant="outline" size="sm" onClick={onClose} className="text-xs gap-1">
                            <X className="h-3.5 w-3.5" /> Tutup
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function CeoSpv({ date, spvTeam, members, totalTasksToday, completedTasksToday }: Props) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const allTasks = members.flatMap((m) => m.tasks);
    const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = date === today;

    const fmtDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);

    const nextDate = new Date(date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);

    const getNavigationHref = (d: string) => `/kpi/ceo/spv?date=${d}`;

    const overallRate = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;

    return (
        <CeoLayout>
            <Head title="SPV Monitor - CEO" />

            {selectedTask && (
                <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="h-7 w-7" />
                            Monitor Tim SPV
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {spvTeam ? spvTeam.name : 'Tidak ada tim SPV yang dikonfigurasi'}
                        </p>
                    </div>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Link
                                href={getNavigationHref(fmtDate(prevDate))}
                                className="inline-flex items-center justify-center h-10 px-3 text-sm font-medium rounded-md border border-input hover:bg-accent hover:text-accent-foreground shrink-0"
                                aria-label="Hari sebelumnya"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden md:inline ml-1">Sebelumnya</span>
                            </Link>
                            <div className="text-center flex-1 min-w-0">
                                <p className="text-sm md:text-lg font-semibold truncate">
                                    {new Intl.DateTimeFormat('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    }).format(new Date(date + 'T00:00:00'))}
                                </p>
                                {isToday && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        Hari Ini
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={date >= today}
                                asChild
                                className="shrink-0"
                                aria-label="Hari berikutnya"
                            >
                                <Link href={getNavigationHref(fmtDate(nextDate))}>
                                    <span className="hidden md:inline mr-1">Berikutnya</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {!spvTeam ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Tim SPV belum dikonfigurasi</p>
                            <p className="text-sm mt-1">
                                Tandai salah satu tim sebagai tim SPV di halaman manajemen tim
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Summary Stats */}
                        <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Anggota SPV
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{members.length}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Task</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{totalTasksToday}</div>
                                    <p className="text-xs text-muted-foreground mt-1">visit_date = tanggal ini</p>
                                </CardContent>
                            </Card>

                            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Terverifikasi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600">{completedTasksToday}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={`text-3xl font-bold ${overallRate >= 80 ? 'text-green-600' : overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
                                    >
                                        {overallRate}%
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Overall Progress */}
                        {totalTasksToday > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>Progress Keseluruhan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {completedTasksToday} dari {totalTasksToday} task terverifikasi
                                            </span>
                                            <span className="font-semibold">{overallRate}%</span>
                                        </div>
                                        <CompletionBar value={overallRate} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Members + Tasks */}
                        <div className="space-y-4">
                            {members.map((member) => {
                                const rate =
                                    member.total_tasks > 0
                                        ? Math.round((member.completed_tasks / member.total_tasks) * 100)
                                        : 0;

                                return (
                                    <Card key={member.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <CardTitle className="text-base">{member.name}</CardTitle>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {member.job_position?.name ?? '-'} • {member.email}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-sm font-semibold">
                                                        {member.completed_tasks}/{member.total_tasks}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            rate >= 80
                                                                ? 'border-green-600 text-green-700'
                                                                : rate >= 50
                                                                  ? 'border-yellow-600 text-yellow-700'
                                                                  : 'border-red-600 text-red-700'
                                                        }
                                                    >
                                                        {rate}%
                                                    </Badge>
                                                </div>
                                            </div>
                                            {member.total_tasks > 0 && <CompletionBar value={rate} />}
                                        </CardHeader>

                                        {member.tasks.length === 0 ? (
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground text-center py-2">
                                                    Tidak ada task untuk tanggal ini
                                                </p>
                                            </CardContent>
                                        ) : (
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    {member.tasks.map((task) => (
                                                        <button
                                                            key={task.id}
                                                            onClick={() => setSelectedTaskId(task.id)}
                                                            className="w-full text-left flex items-start gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors cursor-pointer"
                                                        >
                                                            <div className="mt-0.5 shrink-0">
                                                                {task.is_verified ? (
                                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                ) : (
                                                                    <Circle className="h-5 w-5 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm leading-tight">
                                                                    {task.title}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                                    {task.store && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            🏪 {task.store.branch_code} - {task.store.name}
                                                                        </span>
                                                                    )}
                                                                    {task.visit_date && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            📅{' '}
                                                                            {new Date(
                                                                                task.visit_date + 'T00:00:00',
                                                                            ).toLocaleDateString('id-ID', {
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                            })}
                                                                        </span>
                                                                    )}
                                                                    {task.column_name && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            📋 {task.column_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {task.is_verified ? (
                                                                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                                                            Terverifikasi
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs">
                                                                            Belum Selesai
                                                                        </Badge>
                                                                    )}
                                                                    {task.comments.length > 0 && (
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                                            <MessageSquare className="h-3 w-3" />
                                                                            {task.comments.length}
                                                                        </span>
                                                                    )}
                                                                    {task.media.length > 0 && (
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                                            <Paperclip className="h-3 w-3" />
                                                                            {task.media.length}
                                                                        </span>
                                                                    )}
                                                                    {task.assignees.length > 1 && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            👥 {task.assignees.map((a) => a.name).join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}

                            {members.length === 0 && (
                                <Card>
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        <p>Belum ada anggota di tim SPV</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </CeoLayout>
    );
}
