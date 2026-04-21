import { Link, usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type ActivityLog = {
    id: number;
    log_name: string;
    event: string;
    description: string;
    subject_id: string | null;
    subject_type: string | null;
    causer: { id: number; name: string; email: string } | null;
    properties: Record<string, any> | null;
    created_at: string;
};

type PaginatedLogs = {
    data: ActivityLog[];
    total: number;
    current_page: number;
    last_page: number;
};

const LOG_COLORS: Record<string, string> = {
    task: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    comment:
        'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    team: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    kanban: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    auth: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    announcement:
        'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
};

const LOG_LABELS: Record<string, string> = {
    task: 'Tugas',
    comment: 'Komentar',
    team: 'Tim',
    member: 'Anggota',
    kanban: 'Kanban',
    auth: 'Auth',
    announcement: 'Pengumuman',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
return 'baru saja';
}

    if (minutes < 60) {
return `${minutes} menit lalu`;
}

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
return `${hours} jam lalu`;
}

    const days = Math.floor(hours / 24);

    if (days < 30) {
return `${days} hari lalu`;
}

    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function ActivityItem({ log }: { log: ActivityLog }) {
    const colorClass =
        LOG_COLORS[log.log_name] ?? 'bg-slate-100 text-slate-600';
    const label = LOG_LABELS[log.log_name] ?? log.log_name;
    const initials =
        log.causer?.name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? '?';

    const { team } = usePage<any>().props;

    return (
        <div className="flex items-start gap-3 py-3">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-zinc-700 dark:text-slate-200">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="outline"
                        className={`border-0 px-1.5 py-0 text-[10px] font-medium ${colorClass}`}
                    >
                        {label}
                    </Badge>
                    {log.log_name === 'task' &&
                    log.subject_id &&
                    log.subject_type === 'App\\Models\\Task' ? (
                        <Link
                            href={`/teams/${team.slug}/task?taskId=${log.subject_id}`}
                            className="text-sm leading-snug text-slate-700 transition-colors hover:text-primary hover:underline focus:outline-none dark:text-slate-200"
                        >
                            {log.description}
                        </Link>
                    ) : log.log_name === 'announcement' &&
                      log.subject_id &&
                      log.subject_type === 'App\\Models\\Announcement' ? (
                        <Link
                            href={`/teams/${team.slug}/announcement`}
                            className="text-sm leading-snug text-slate-700 transition-colors hover:text-primary hover:underline focus:outline-none dark:text-slate-200"
                        >
                            {log.description}
                        </Link>
                    ) : (
                        <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">
                            {log.description}
                        </p>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.causer?.name ?? 'Sistem'} · {timeAgo(log.created_at)}
                </p>
            </div>
        </div>
    );
}

export function ActivityTab() {
    const { activityLogs } = usePage<{ activityLogs?: PaginatedLogs }>().props;

    if (!activityLogs || activityLogs.data.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">
                    Belum ada aktivitas yang tercatat.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                Riwayat Aktivitas
            </h2>
            <div className="divide-y divide-border">
                {activityLogs.data.map((log) => (
                    <ActivityItem key={log.id} log={log} />
                ))}
            </div>
            {activityLogs.current_page < activityLogs.last_page && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Menampilkan {activityLogs.data.length} dari{' '}
                    {activityLogs.total} aktivitas
                </p>
            )}
        </div>
    );
}
