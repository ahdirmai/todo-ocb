import { Head, router, usePage, Link } from '@inertiajs/react';
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
    team: { slug: string; name: string } | null;
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

const FILTER_TABS = [
    '',
    'task',
    'announcement',
    'comment',
    'team',
    'member',
    'kanban',
    'auth',
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
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
            { preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Riwayat Aktivitas" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div>
                        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Riwayat Aktivitas
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Log seluruh aktivitas yang terjadi di aplikasi
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 border-b border-sidebar-border/50 px-6 py-3 sm:flex-row sm:items-center">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === 'Enter' &&
                            applyFilter(filters.log_name ?? '', search)
                        }
                        placeholder="Cari aktivitas..."
                        className="h-8 max-w-xs text-sm"
                    />
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 shrink-0 text-xs"
                        onClick={() =>
                            applyFilter(filters.log_name ?? '', search)
                        }
                    >
                        Cari
                    </Button>

                    <div className="ml-0 flex flex-nowrap overflow-x-auto pb-1 scrollbar-hide items-center gap-1.5 sm:ml-auto sm:flex-wrap">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab || 'all'}
                                onClick={() => applyFilter(tab)}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    (filters.log_name ?? '') === tab
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {tab ? (LOG_LABELS[tab] ?? tab) : 'Semua'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline Table */}
                <div className="flex-1 overflow-auto p-6">
                    {activityLogs.data.length === 0 ? (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                            Tidak ada aktivitas yang ditemukan.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900/10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                            Waktu
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                            Pelaku
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                            Aktivitas
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                            Keterangan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/50">
                                    {activityLogs.data.map((log) => {
                                        const colorClass =
                                            LOG_COLORS[log.log_name] ?? '';
                                        const label =
                                            LOG_LABELS[log.log_name] ??
                                            log.log_name;
                                        const initials =
                                            log.causer?.name
                                                ?.split(' ')
                                                .map((n) => n[0])
                                                .join('')
                                                .slice(0, 2)
                                                .toUpperCase() ?? '?';

                                        return (
                                            <tr
                                                key={log.id}
                                                className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {timeAgo(log.created_at)}
                                                </td>
                                                <td className="px-4 py-3 font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="bg-slate-200 text-[10px] font-semibold dark:bg-zinc-700">
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {log.causer?.name ??
                                                            'Sistem'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={`border-0 px-1.5 py-0 text-[10px] font-medium ${colorClass}`}
                                                    >
                                                        {label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {log.log_name === 'task' &&
                                                    log.team &&
                                                    log.subject_id &&
                                                    log.subject_type ===
                                                        'App\\Models\\Task' ? (
                                                        <Link
                                                            href={`/teams/${log.team.slug}/task?taskId=${log.subject_id}`}
                                                            className="text-sm leading-snug text-slate-700 transition-colors hover:text-primary hover:underline focus:outline-none dark:text-slate-200"
                                                        >
                                                            {log.description}
                                                        </Link>
                                                    ) : log.log_name ===
                                                          'announcement' &&
                                                      log.team &&
                                                      log.subject_id &&
                                                      log.subject_type ===
                                                          'App\\Models\\Announcement' ? (
                                                        <Link
                                                            href={`/teams/${log.team.slug}/announcement`}
                                                            className="text-sm leading-snug text-slate-700 transition-colors hover:text-primary hover:underline focus:outline-none dark:text-slate-200"
                                                        >
                                                            {log.description}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-slate-700 dark:text-slate-200">
                                                            {log.description}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {activityLogs.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-between pt-2">
                            <p className="text-xs text-muted-foreground">
                                Halaman {activityLogs.current_page} dari{' '}
                                {activityLogs.last_page} · Menampilkan{' '}
                                {activityLogs.data.length} dari{' '}
                                {activityLogs.total} aktivitas
                            </p>
                            <div className="flex gap-2">
                                {activityLogs.prev_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(
                                                activityLogs.prev_page_url!,
                                            )
                                        }
                                    >
                                        ← Sebelumnya
                                    </Button>
                                )}
                                {activityLogs.next_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(
                                                activityLogs.next_page_url!,
                                            )
                                        }
                                    >
                                        Berikutnya →
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ActivityIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
