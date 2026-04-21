import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Building2,
    CheckCircle2,
    FileText,
    FolderKanban,
    Shield,
    Sparkles,
    TimerReset,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { dashboard as dashboardRoute } from '@/routes';

type DashboardStat = {
    label: string;
    value: number;
    description: string;
    tone?: 'danger';
};

type ChartPoint = {
    label: string;
    total: number;
    slug?: string | null;
};

type FeedItem = {
    id: number;
    log_name: string;
    event: string;
    description: string;
    team: string | null;
    team_slug: string | null;
    created_at: string;
    created_label: string;
};

type DueSoonItem = {
    id: string;
    title: string;
    team: string | null;
    team_slug: string | null;
    stage: string | null;
    due_date: string | null;
    due_label: string | null;
};

type TeamSnapshot = {
    id: string;
    name: string;
    slug: string;
    tasks: number;
    documents: number;
    announcements: number;
    my_open_tasks: number;
};

type AttentionTeam = {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    members: number;
    tasks: number;
    open_tasks: number;
    overdue_tasks: number;
    documents: number;
    announcements: number;
};

type Headline = {
    eyebrow: string;
    title: string;
    description: string;
};

type MemberDashboard = {
    role: 'member';
    headline: Headline;
    stats: DashboardStat[];
    statusChart: ChartPoint[];
    teamLoadChart: ChartPoint[];
    dueSoon: DueSoonItem[];
    teamSnapshots: TeamSnapshot[];
    activityFeed: FeedItem[];
};

type AdminDashboard = {
    role: 'admin';
    headline: Headline;
    stats: DashboardStat[];
    tasksByTeam: ChartPoint[];
    tasksByStage: ChartPoint[];
    activityTrend: ChartPoint[];
    attentionTeams: AttentionTeam[];
    activityFeed: FeedItem[];
};

type SuperadminDashboard = Omit<AdminDashboard, 'role'> & {
    role: 'superadmin';
    portfolioStats: DashboardStat[];
    groupingBreakdown: ChartPoint[];
    roleDistribution: ChartPoint[];
    contentMix: ChartPoint[];
};

type DashboardPayload = MemberDashboard | AdminDashboard | SuperadminDashboard;

const CHART_COLORS = ['#0f766e', '#0284c7', '#f97316', '#4f46e5', '#dc2626', '#0891b2'];

function formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
}

function roleBadge(role: DashboardPayload['role']): { label: string; className: string; icon: LucideIcon } {
    if (role === 'superadmin') {
        return {
            label: 'Superadmin View',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
            icon: Shield,
        };
    }

    if (role === 'admin') {
        return {
            label: 'Admin View',
            className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
            icon: Building2,
        };
    }

    return {
        label: 'Member View',
        className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
        icon: CheckCircle2,
    };
}

function StatCard({ stat, index }: { stat: DashboardStat; index: number }) {
    const Icon = stat.tone === 'danger' ? AlertTriangle : [FolderKanban, CheckCircle2, TimerReset, FileText][index % 4];

    return (
        <Card className="border-sidebar-border/70 bg-white/90 shadow-sm dark:bg-zinc-900/70">
            <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
                <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                        {stat.label}
                    </p>
                    <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                        {formatNumber(stat.value)}
                    </p>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {stat.description}
                    </p>
                </div>
                <div
                    className={`rounded-2xl p-3 ${stat.tone === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-200'}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function SectionHeader({
    title,
    description,
    icon: Icon,
}: {
    title: string;
    description: string;
    icon: typeof BarChart3;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-950 p-2.5 text-white dark:bg-slate-100 dark:text-slate-950">
                <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                    {title}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                </p>
            </div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-sidebar-border/70 bg-slate-50/70 text-sm text-slate-500 dark:bg-zinc-900/40 dark:text-slate-400">
            {label}
        </div>
    );
}

function SimpleBarChart({ data, color = CHART_COLORS[0] }: { data: ChartPoint[]; color?: string }) {
    if (data.length === 0) {
        return <EmptyState label="Belum ada data untuk divisualisasikan." />;
    }

    return (
        <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                    <Bar dataKey="total" radius={[10, 10, 4, 4]} fill={color} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function TrendLineChart({ data }: { data: ChartPoint[] }) {
    if (data.length === 0) {
        return <EmptyState label="Belum ada tren aktivitas yang bisa ditampilkan." />;
    }

    return (
        <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function DonutChart({ data }: { data: ChartPoint[] }) {
    if (data.length === 0) {
        return <EmptyState label="Belum ada komposisi data untuk ditampilkan." />;
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="total" nameKey="label" innerRadius={65} outerRadius={95} paddingAngle={3}>
                            {data.map((entry, index) => (
                                <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid content-center gap-3">
                {data.map((entry, index) => (
                    <div key={entry.label} className="flex items-center justify-between rounded-2xl border border-sidebar-border/70 px-4 py-3 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {entry.label}
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {formatNumber(entry.total)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActivityFeed({ items }: { items: FeedItem[] }) {
    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <EmptyState label="Belum ada aktivitas terbaru yang relevan." />
            ) : (
                items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-sidebar-border/70 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {item.log_name || 'aktivitas'}
                                </Badge>
                                {item.team && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {item.team}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {item.created_label}
                            </span>
                        </div>
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {item.description}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
}

function DueSoonList({ items }: { items: DueSoonItem[] }) {
    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <EmptyState label="Belum ada deadline dekat yang perlu diwaspadai." />
            ) : (
                items.map((item) => (
                    <Link
                        key={item.id}
                        href={item.team_slug ? `/teams/${item.team_slug}/task?taskId=${item.id}` : '#'}
                        className="block rounded-2xl border border-sidebar-border/70 bg-white/80 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                    >
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-900 dark:text-slate-50">
                                {item.title}
                            </p>
                            {item.stage && (
                                <Badge variant="outline">{item.stage}</Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                            <span>{item.team ?? 'Tanpa tim'}</span>
                            <span>&middot;</span>
                            <span>{item.due_label ?? item.due_date ?? 'Tanpa due date'}</span>
                        </div>
                    </Link>
                ))
            )}
        </div>
    );
}

function TeamSnapshotList({ items }: { items: TeamSnapshot[] }) {
    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <EmptyState label="Belum ada snapshot tim yang bisa diringkas." />
            ) : (
                items.map((item) => (
                    <Link
                        key={item.id}
                        href={`/teams/${item.slug}`}
                        className="block rounded-2xl border border-sidebar-border/70 bg-white/80 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-900 dark:text-slate-50">
                                {item.name}
                            </p>
                            <Badge variant="secondary">{formatNumber(item.my_open_tasks)} open buatmu</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <div>
                                <p className="text-xs uppercase text-slate-400">Tasks</p>
                                <p className="font-semibold">{formatNumber(item.tasks)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-400">Docs</p>
                                <p className="font-semibold">{formatNumber(item.documents)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-400">Announcements</p>
                                <p className="font-semibold">{formatNumber(item.announcements)}</p>
                            </div>
                        </div>
                    </Link>
                ))
            )}
        </div>
    );
}

function AttentionTable({ items }: { items: AttentionTeam[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-sidebar-border/70 dark:border-zinc-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-zinc-900/80">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Tim</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Anggota</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Open</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Overdue</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Dokumen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border/70 dark:divide-zinc-800">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    Belum ada tim yang perlu dianalisis.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="bg-white/80 dark:bg-zinc-900/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Link href={`/teams/${item.slug}`} className="font-medium text-slate-900 hover:text-primary dark:text-slate-50">
                                                {item.name}
                                            </Link>
                                            {!item.is_active && (
                                                <Badge variant="outline">Arsip</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatNumber(item.members)}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatNumber(item.open_tasks)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-semibold ${item.overdue_tasks > 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {formatNumber(item.overdue_tasks)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatNumber(item.documents)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function Dashboard({ dashboard }: { dashboard: DashboardPayload }) {
    const roleMeta = roleBadge(dashboard.role);
    const RoleIcon = roleMeta.icon;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-8 overflow-x-auto rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(to_bottom,_rgba(255,255,255,0.96),_rgba(248,250,252,0.96))] p-5 md:p-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.1),_transparent_20%),linear-gradient(to_bottom,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))]">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                            {dashboard.headline.eyebrow}
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">
                            {dashboard.headline.title}
                        </h1>
                    </div>
                    <Badge className={`gap-2 rounded-full border ${roleMeta.className}`} variant="outline">
                        <RoleIcon className="h-3.5 w-3.5" />
                        {roleMeta.label}
                    </Badge>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {dashboard.stats.map((stat, index) => (
                        <StatCard key={stat.label} stat={stat} index={index} />
                    ))}
                </section>

                {dashboard.role === 'member' ? (
                    <div className="grid gap-8">
                        <section className="grid gap-4 lg:grid-cols-2">
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Distribusi tugas saya"
                                        description="Lihat task pribadimu sedang menumpuk di kolom mana. Ini memudahkan membaca apakah bottleneck-mu ada di review, progress, atau finishing."
                                        icon={BarChart3}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <SimpleBarChart data={dashboard.statusChart} color="#0f766e" />
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Beban per tim"
                                        description="Kalau kamu aktif di beberapa tim, chart ini menunjukkan tim mana yang sedang paling banyak menyita kapasitasmu."
                                        icon={Users}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <SimpleBarChart data={dashboard.teamLoadChart} color="#0284c7" />
                                </CardContent>
                            </Card>
                        </section>

                        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Deadline dekat"
                                        description="Antrian tugas yang perlu kamu sentuh paling cepat, diurutkan berdasarkan due date terdekat."
                                        icon={TimerReset}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <DueSoonList items={dashboard.dueSoon} />
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Snapshot tim"
                                        description="Ringkasan cepat supaya kamu tahu konteks tiap tim tanpa harus buka satu-satu."
                                        icon={Building2}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <TeamSnapshotList items={dashboard.teamSnapshots} />
                                </CardContent>
                            </Card>
                        </section>

                        <section>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Aktivitas tim terbaru"
                                        description="Feed ini membantu member membaca perubahan konteks di tim-tim tempat ia bekerja."
                                        icon={Sparkles}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <ActivityFeed items={dashboard.activityFeed} />
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        <section className="grid gap-4 lg:grid-cols-2">
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Open tasks per tim"
                                        description="Chart ini langsung menunjukkan tim mana yang menyimpan antrean kerja terbanyak dan pantas diawasi lebih dulu."
                                        icon={FolderKanban}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <SimpleBarChart data={dashboard.tasksByTeam} color="#0f766e" />
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Distribusi task per stage"
                                        description="Distribusi stage memudahkan membaca apakah eksekusi tersumbat di backlog, progress, review, atau penutupan."
                                        icon={BarChart3}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <SimpleBarChart data={dashboard.tasksByStage} color="#f97316" />
                                </CardContent>
                            </Card>
                        </section>

                        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Tren aktivitas 14 hari"
                                        description="Volume aktivitas membantu membedakan tim yang benar-benar bergerak dari tim yang terlihat sibuk tapi tidak banyak menghasilkan update."
                                        icon={Sparkles}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <TrendLineChart data={dashboard.activityTrend} />
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Aktivitas terbaru"
                                        description="Feed cepat untuk menangkap perubahan terakhir tanpa harus membuka halaman activity penuh."
                                        icon={CheckCircle2}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <ActivityFeed items={dashboard.activityFeed} />
                                </CardContent>
                            </Card>
                        </section>

                        <section>
                            <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70">
                                <CardHeader>
                                    <SectionHeader
                                        title="Tim yang perlu perhatian"
                                        description="Daftar ini menonjolkan tim dengan overdue dan open tasks tertinggi. Cocok untuk triase harian admin."
                                        icon={AlertTriangle}
                                    />
                                </CardHeader>
                                <CardContent>
                                    <AttentionTable items={dashboard.attentionTeams} />
                                </CardContent>
                            </Card>
                        </section>

                        {dashboard.role === 'superadmin' && (
                            <section className="grid gap-8">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    {dashboard.portfolioStats.map((stat, index) => (
                                        <StatCard key={stat.label} stat={stat} index={index} />
                                    ))}
                                </div>

                                <div className="grid gap-4 lg:grid-cols-3">
                                    <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70 lg:col-span-1">
                                        <CardHeader>
                                            <SectionHeader
                                                title="Grouping unit"
                                                description="Membantu melihat komposisi portofolio berdasarkan HQ, Tim, dan Proyek."
                                                icon={Building2}
                                            />
                                        </CardHeader>
                                        <CardContent>
                                            <DonutChart data={dashboard.groupingBreakdown} />
                                        </CardContent>
                                    </Card>
                                    <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70 lg:col-span-1">
                                        <CardHeader>
                                            <SectionHeader
                                                title="Distribusi role"
                                                description="Menunjukkan sebaran akses dan hirarki peran di seluruh aplikasi."
                                                icon={Shield}
                                            />
                                        </CardHeader>
                                        <CardContent>
                                            <DonutChart data={dashboard.roleDistribution} />
                                        </CardContent>
                                    </Card>
                                    <Card className="border-sidebar-border/70 bg-white/85 dark:bg-zinc-900/70 lg:col-span-1">
                                        <CardHeader>
                                            <SectionHeader
                                                title="Knowledge & komunikasi"
                                                description="Campuran aset organisasi: dokumen, SOP, pengumuman, komentar, dan pesan tim."
                                                icon={BookOpen}
                                            />
                                        </CardHeader>
                                        <CardContent>
                                            <DonutChart data={dashboard.contentMix} />
                                        </CardContent>
                                    </Card>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboardRoute(),
        },
    ],
};
