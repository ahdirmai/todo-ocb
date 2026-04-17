import { usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type ActivityLog = {
    id: number;
    log_name: string;
    event: string;
    description: string;
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
    comment: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    team: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    kanban: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    auth: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const LOG_LABELS: Record<string, string> = {
    task: 'Tugas',
    comment: 'Komentar',
    team: 'Tim',
    member: 'Anggota',
    kanban: 'Kanban',
    auth: 'Auth',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ActivityItem({ log }: { log: ActivityLog }) {
    const colorClass = LOG_COLORS[log.log_name] ?? 'bg-slate-100 text-slate-600';
    const label = LOG_LABELS[log.log_name] ?? log.log_name;
    const initials = log.causer?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ?? '?';

    return (
        <div className="flex items-start gap-3 py-3">
            <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs font-semibold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-medium border-0 ${colorClass}`}>
                        {label}
                    </Badge>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{log.description}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
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
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <p className="text-muted-foreground text-sm">Belum ada aktivitas yang tercatat.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl w-full">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Riwayat Aktivitas</h2>
            <div className="divide-y divide-border">
                {activityLogs.data.map((log) => (
                    <ActivityItem key={log.id} log={log} />
                ))}
            </div>
            {activityLogs.current_page < activityLogs.last_page && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                    Menampilkan {activityLogs.data.length} dari {activityLogs.total} aktivitas
                </p>
            )}
        </div>
    );
}
