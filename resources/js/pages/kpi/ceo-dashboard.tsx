import CeoLayout from '@/layouts/ceo-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertCircle,
    TrendingUp,
    Users,
    ChevronLeft,
    ChevronRight,
    Building2,
    Eye,
    FileText,
} from 'lucide-react';

interface Score {
    id: string;
    user: {
        id: number;
        name: string;
        email: string;
        job_position: {
            id: string;
            name: string;
        } | null;
    };
    total_score: number;
    grade: string;
    verified_tasks: number;
    completed_tasks: number;
    total_tasks: number;
}

interface UserItem {
    id: number;
    name: string;
    email: string;
}

interface SpvSummary {
    team_name: string;
    member_count: number;
    tasks_today: number;
}

interface Props {
    allScores: Score[];
    hrScores: Score[];
    opsScores: Score[];
    gudangScores: Score[];
    gradeDistribution: Record<string, number>;
    criticalAlerts: Score[];
    lateReports: Array<{ id: string; user: UserItem; submitted_at: string }>;
    pendingReports: UserItem[];
    spvSummary: SpvSummary | null;
    date: string;
    positionFilter: string;
}

function ScoreRow({ score, date }: { score: Score; date: string }) {
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div>
                    <p className="font-semibold truncate">{score.user.name}</p>
                    <p className="text-xs text-muted-foreground">{score.user.job_position?.name ?? '-'}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                    {score.verified_tasks}/{score.total_tasks} verified
                </span>
                <span className="text-lg font-bold">{score.total_score.toFixed(1)}%</span>
                <GradeBadge grade={score.grade} />
                <Link href={`/kpi/ceo/user/${score.user.id}?date=${date}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function PositionSection({
    title,
    scores,
    date,
    emptyText,
}: {
    title: string;
    scores: Score[];
    date: string;
    emptyText: string;
}) {
    const avg = scores.length > 0 ? scores.reduce((s, r) => s + r.total_score, 0) / scores.length : null;

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {avg !== null && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{scores.length} orang</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">avg {avg.toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {scores.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
                ) : (
                    <div className="space-y-2">
                        {scores.map((score) => (
                            <ScoreRow key={score.id} score={score} date={date} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function KpiCeoDashboard({
    allScores,
    hrScores,
    opsScores,
    gudangScores,
    gradeDistribution,
    criticalAlerts,
    lateReports,
    pendingReports,
    spvSummary,
    date,
    positionFilter,
}: Props) {
    const addDays = (dateStr: string, days: number): string => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d + days);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const todayLocal = (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })();

    const isToday = date === todayLocal;
    const prevDateStr = addDays(date, -1);
    const nextDateStr = addDays(date, 1);

    const averageScore =
        allScores.length > 0 ? allScores.reduce((sum, s) => sum + s.total_score, 0) / allScores.length : 0;

    const totalAlerts = criticalAlerts.length + lateReports.length + pendingReports.length;

    const prevHref = `/kpi/ceo/dashboard?date=${prevDateStr}&position=${positionFilter}`;
    const nextHref = `/kpi/ceo/dashboard?date=${nextDateStr}&position=${positionFilter}`;

    const displayScores =
        positionFilter === 'hr' ? hrScores : positionFilter === 'operational' ? opsScores : positionFilter === 'gudang' ? gudangScores : allScores;

    return (
        <CeoLayout>
            <Head title="CEO Area - KPI Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">KPI Dashboard CEO</h1>
                        <p className="text-muted-foreground text-sm">
                            Monitor performa Manager HR, Manager Operasional, Manager Gudang & Tim SPV
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {totalAlerts > 0 && (
                            <Link href={`/kpi/ceo/alerts?date=${date}`}>
                                <Button variant="destructive" size="sm">
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    {totalAlerts} Alert Kritis
                                </Button>
                            </Link>
                        )}
                        <Link href={`/kpi/ceo/daily-reports?date=${date}`}>
                            <Button variant="outline" size="sm">
                                <FileText className="mr-2 h-4 w-4" />
                                Laporan Harian
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Link
                                href={prevHref}
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
                                disabled={isToday}
                                asChild
                                className="shrink-0"
                                aria-label="Hari berikutnya"
                            >
                                <Link href={nextHref}>
                                    <span className="hidden md:inline mr-1">Berikutnya</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Total Manager
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{allScores.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                HR: {hrScores.length} | Ops: {opsScores.length} | Gudang: {gudangScores.length}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Rata-rata Skor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{averageScore.toFixed(1)}%</div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400">
                                Excellent (A+/A)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {(gradeDistribution['A+'] || 0) + (gradeDistribution['A'] || 0)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-400">
                                Critical (D)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">{gradeDistribution['D'] || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Grade Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Distribusi Grade Hari Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-4">
                            {['A+', 'A', 'B', 'C', 'D'].map((grade) => (
                                <div key={grade} className="text-center">
                                    <GradeBadge grade={grade} size="lg" />
                                    <p className="text-3xl font-bold mt-2">{gradeDistribution[grade] || 0}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {allScores.length > 0
                                            ? (((gradeDistribution[grade] || 0) / allScores.length) * 100).toFixed(0)
                                            : 0}
                                        %
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* SPV Summary */}
                {spvSummary && (
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    Tim SPV — {spvSummary.team_name}
                                </CardTitle>
                                <Link href={`/kpi/ceo/spv?date=${date}`}>
                                    <Button variant="outline" size="sm">
                                        Detail SPV
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-3xl font-bold text-blue-600">{spvSummary.member_count}</p>
                                    <p className="text-sm text-muted-foreground">Anggota SPV</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-blue-600">{spvSummary.tasks_today}</p>
                                    <p className="text-sm text-muted-foreground">Task Hari Ini</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Alerts Summary */}
                {totalAlerts > 0 && (
                    <Card className="border-red-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Critical Alerts ({totalAlerts})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {criticalAlerts.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-red-800 text-sm">Grade D - Perlu Tindakan Segera</p>
                                        <p className="text-sm text-red-600">{criticalAlerts.length} manager performa kritis</p>
                                    </div>
                                    <Badge variant="destructive">{criticalAlerts.length}</Badge>
                                </div>
                            )}
                            {lateReports.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-orange-800 text-sm">Laporan Terlambat</p>
                                        <p className="text-sm text-orange-600">Dikirim setelah 23:30 WITA</p>
                                    </div>
                                    <Badge className="bg-orange-600">{lateReports.length}</Badge>
                                </div>
                            )}
                            {pendingReports.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-yellow-800 text-sm">Laporan Belum Masuk</p>
                                        <p className="text-sm text-yellow-600">{pendingReports.length} manager belum submit laporan</p>
                                    </div>
                                    <Badge variant="outline" className="border-yellow-600 text-yellow-800">
                                        {pendingReports.length}
                                    </Badge>
                                </div>
                            )}
                            <Link href={`/kpi/ceo/alerts?date=${date}`}>
                                <Button variant="destructive" className="w-full" size="sm">
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Lihat Detail Semua Alert
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Position Filter Tabs */}
                <div className="flex gap-2 border-b pb-2">
                    {[
                        { key: 'all', label: `Semua (${allScores.length})` },
                        { key: 'hr', label: `Manager HR (${hrScores.length})` },
                        { key: 'operational', label: `Manager Ops (${opsScores.length})` },
                        { key: 'gudang', label: `Manager Gudang (${gudangScores.length})` },
                    ].map((tab) => (
                        <Link
                            key={tab.key}
                            href={`/kpi/ceo/dashboard?date=${date}&position=${tab.key}`}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                positionFilter === tab.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>

                {/* Scores by Position */}
                {positionFilter === 'all' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <PositionSection
                            title="Manager HR"
                            scores={hrScores}
                            date={date}
                            emptyText="Belum ada data skor Manager HR untuk tanggal ini"
                        />
                        <PositionSection
                            title="Manager Operasional"
                            scores={opsScores}
                            date={date}
                            emptyText="Belum ada data skor Manager Operasional untuk tanggal ini"
                        />
                        <PositionSection
                            title="Manager Gudang"
                            scores={gudangScores}
                            date={date}
                            emptyText="Belum ada data skor Manager Gudang untuk tanggal ini"
                        />
                    </div>
                ) : (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>
                                {positionFilter === 'hr' ? 'Manager HR' : positionFilter === 'operational' ? 'Manager Operasional' : 'Manager Gudang'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {displayScores.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada data skor untuk tanggal ini
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {displayScores.map((score) => (
                                        <ScoreRow key={score.id} score={score} date={date} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </CeoLayout>
    );
}
