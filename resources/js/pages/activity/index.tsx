import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type ActivityLog = {
    id: number;
    log_name: string;
    event: string;
    description: string;
    causer: { id: number; name: string } | null;
    properties: Record<string, any> | null;
    team_id: number | null;
    created_at: string;
};

type PaginatedLogs = {
    data: ActivityLog[];
    total: number;
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
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

const FILTER_TABS = ['', 'task', 'comment', 'team', 'member', 'kanban', 'auth'];

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

export default function ActivityIndex() {
    const { activityLogs, filters } = usePage<{
        activityLogs: PaginatedLogs;
        filters: { log_name?: string; search?: string };
    }>().props;

    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilter = (logName: string, searchTerm?: string) => {
        router.get(
            '/activity',
            {
                log_name: logName || undefined,
                search: (searchTerm ?? search) || undefined,
            },
            { preserveScroll: true, replace: true }
        );
    };

    return (
        <>
            <Head title="Riwayat Aktivitas" />
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Riwayat Aktivitas</h1>
                <p className="text-sm text-muted-foreground mb-6">Log seluruh aktivitas yang terjadi di aplikasi</p>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab || 'all'}
                            onClick={() => applyFilter(tab)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                                (filters.log_name ?? '') === tab
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            {tab ? (LOG_LABELS[tab] ?? tab) : 'Semua'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex gap-2 mb-6">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilter(filters.log_name ?? '', search)}
                        placeholder="Cari aktivitas..."
                        className="max-w-sm h-8 text-sm"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={() => applyFilter(filters.log_name ?? '', search)}>
                        Cari
                    </Button>
                </div>

                {/* Timeline */}
                {activityLogs.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-16">Tidak ada aktivitas yang ditemukan.</p>
                ) : (
                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                        {activityLogs.data.map((log) => {
                            const colorClass = LOG_COLORS[log.log_name] ?? '';
                            const label = LOG_LABELS[log.log_name] ?? log.log_name;
                            const initials = log.causer?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

                            return (
                                <div key={log.id} className="flex items-start gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors">
                                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                                        <AvatarFallback className="text-xs font-semibold bg-slate-200 dark:bg-zinc-700">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-medium border-0 ${colorClass}`}>
                                                {label}
                                            </Badge>
                                            <p className="text-sm text-slate-700 dark:text-slate-200">{log.description}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {log.causer?.name ?? 'Sistem'} ·{' '}
                                            {timeAgo(log.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {activityLogs.last_page > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-xs text-muted-foreground">
                            Halaman {activityLogs.current_page} dari {activityLogs.last_page} · {activityLogs.total} total aktivitas
                        </p>
                        <div className="flex gap-2">
                            {activityLogs.prev_page_url && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.visit(activityLogs.prev_page_url!)}>
                                    ← Sebelumnya
                                </Button>
                            )}
                            {activityLogs.next_page_url && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.visit(activityLogs.next_page_url!)}>
                                    Berikutnya →
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

ActivityIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
