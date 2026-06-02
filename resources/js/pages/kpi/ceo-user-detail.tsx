import CeoLayout from '@/layouts/ceo-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    Circle,
    TrendingUp,
    Clock,
} from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    job_position: { id: string; name: string } | null;
}

interface DailyScore {
    total_score: number;
    grade: string;
    verified_tasks: number;
    completed_tasks: number;
    total_tasks: number;
    category_breakdown: Record<
        string,
        { total_tasks: number; completed_tasks: number; total_weight: number; completed_weight: number }
    > | null;
    task_details: Array<{
        task_id: string;
        name: string;
        category: string;
        weight: number;
        is_verified: boolean;
        is_done: boolean;
    }> | null;
}

interface WeeklyScore {
    average_score: number;
    grade: string;
    week_start_date: string;
    week_end_date: string;
    category_breakdown: Record<string, unknown> | null;
}

interface MonthlyScore {
    average_score: number;
    final_score: number;
    consistency_bonus: number;
    grade: string;
    has_grade_d: boolean;
}

interface RecentScore {
    date: string;
    total_score: number;
    grade: string;
    verified_tasks: number;
    total_tasks: number;
}

interface DailyReport {
    id: string;
    submitted_at: string;
    is_late: boolean;
    status_34_tasks: string | null;
    spv_status: string | null;
    issues_today: string | null;
    follow_up: string | null;
    action_plan: string | null;
    report_data: Record<string, string> | null;
}

interface Props {
    user: UserData;
    date: string;
    dailyScore: DailyScore | null;
    weeklyScore: WeeklyScore | null;
    monthlyScore: MonthlyScore | null;
    recentScores: RecentScore[];
    dailyReport: DailyReport | null;
}

export default function CeoUserDetail({
    user,
    date,
    dailyScore,
    weeklyScore,
    monthlyScore,
    recentScores,
    dailyReport,
}: Props) {
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);

    const nextDate = new Date(date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);

    const navigate = (d: string) => {
        router.get(`/kpi/ceo/user/${user.id}`, { date: d }, { preserveScroll: true });
    };

    const tasksByCategory = dailyScore?.task_details
        ? dailyScore.task_details.reduce(
              (acc, task) => {
                  if (!acc[task.category]) {
                      acc[task.category] = [];
                  }
                  acc[task.category].push(task);
                  return acc;
              },
              {} as Record<string, typeof dailyScore.task_details>,
          )
        : {};

    const getReportFields = (): Array<{ label: string; value: string }> => {
        if (!dailyReport) {
            return [];
        }
        if (dailyReport.report_data && Object.keys(dailyReport.report_data).length > 0) {
            const labels: Record<string, string> = {
                absensi: 'Absensi',
                disiplin: 'Disiplin',
                performance_sales: 'Performance Sales',
                compliance: 'Compliance',
                training: 'Training',
                recruitment: 'Recruitment',
                notes: 'Catatan',
            };
            return Object.entries(dailyReport.report_data)
                .filter(([, v]) => v)
                .map(([k, v]) => ({ label: labels[k] ?? k, value: v }));
        }
        return [
            { label: 'Status Task', value: dailyReport.status_34_tasks ?? '' },
            { label: 'Status SPV', value: dailyReport.spv_status ?? '' },
            { label: 'Masalah Hari Ini', value: dailyReport.issues_today ?? '' },
            { label: 'Tindak Lanjut', value: dailyReport.follow_up ?? '' },
            { label: 'Rencana Aksi Besok', value: dailyReport.action_plan ?? '' },
        ].filter((f) => f.value);
    };

    return (
        <CeoLayout>
            <Head title={`KPI Detail - ${user.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={`/kpi/ceo/dashboard?date=${date}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{user.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            {user.job_position?.name ?? 'Posisi tidak diketahui'} • {user.email}
                        </p>
                    </div>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(prevDate.toISOString().split('T')[0])}
                                className="shrink-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden md:inline ml-1">Sebelumnya</span>
                            </Button>
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
                                onClick={() => navigate(nextDate.toISOString().split('T')[0])}
                                disabled={isToday}
                                className="shrink-0"
                            >
                                <span className="hidden md:inline mr-1">Berikutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Score Overview */}
                <div className="grid grid-cols-1 gap-3 md:gap-6 md:grid-cols-3">
                    {dailyScore ? (
                        <ScoreCard
                            title="Skor Harian"
                            score={dailyScore.total_score}
                            grade={dailyScore.grade}
                            description={`${dailyScore.verified_tasks}/${dailyScore.total_tasks} task terverifikasi`}
                        />
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Skor Harian</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Belum ada skor untuk tanggal ini</p>
                            </CardContent>
                        </Card>
                    )}

                    {weeklyScore ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Rata-rata Minggu Ini
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{weeklyScore.average_score.toFixed(1)}%</span>
                                    <GradeBadge grade={weeklyScore.grade} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(weeklyScore.week_start_date + 'T00:00:00').toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                    })}{' '}
                                    -{' '}
                                    {new Date(weeklyScore.week_end_date + 'T00:00:00').toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rata-rata Minggu Ini</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Belum ada data mingguan</p>
                            </CardContent>
                        </Card>
                    )}

                    {monthlyScore ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Skor Bulan Ini</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold">{monthlyScore.final_score.toFixed(1)}%</span>
                                        <GradeBadge grade={monthlyScore.grade} />
                                    </div>
                                    {monthlyScore.consistency_bonus > 0 && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            +{monthlyScore.consistency_bonus}% Bonus Konsistensi
                                        </Badge>
                                    )}
                                    {monthlyScore.has_grade_d && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                            Ada Grade D bulan ini
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Skor Bulan Ini</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Belum ada data bulanan</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Category Breakdown */}
                {dailyScore?.category_breakdown && Object.keys(dailyScore.category_breakdown).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress per Kategori</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(dailyScore.category_breakdown).map(([category, data]) => (
                                    <div key={category} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{category}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {data.completed_weight.toFixed(0)}/{data.total_weight.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all"
                                                style={{
                                                    width: `${data.total_weight > 0 ? (data.completed_weight / data.total_weight) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {data.completed_tasks}/{data.total_tasks} task
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Task Details */}
                {Object.keys(tasksByCategory).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Detail Task ({dailyScore?.total_tasks ?? 0} task)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Object.entries(tasksByCategory).map(([category, tasks]) => (
                                    <div key={category} className="space-y-3">
                                        <h3 className="font-semibold border-b pb-2">{category}</h3>
                                        <div className="space-y-2">
                                            {tasks.map((task) => (
                                                <div
                                                    key={task.task_id}
                                                    className="flex items-start gap-3 p-3 rounded-lg border"
                                                >
                                                    <div className="mt-0.5">
                                                        {task.is_verified ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="font-medium text-sm">{task.name}</p>
                                                            <Badge variant="secondary" className="shrink-0">
                                                                {task.weight}%
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {task.is_verified && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-green-50 text-green-700 text-xs"
                                                                >
                                                                    Terverifikasi
                                                                </Badge>
                                                            )}
                                                            {task.is_done && !task.is_verified && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-yellow-50 text-yellow-700 text-xs"
                                                                >
                                                                    Selesai - Perlu Bukti
                                                                </Badge>
                                                            )}
                                                            {!task.is_done && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-gray-50 text-gray-700 text-xs"
                                                                >
                                                                    Belum Selesai
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Score History */}
                {recentScores.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Riwayat Skor 14 Hari Terakhir
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {recentScores.map((score) => (
                                    <div
                                        key={score.date}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-medium">
                                                {new Date(score.date + 'T00:00:00').toLocaleDateString('id-ID', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </p>
                                            {score.date === date && (
                                                <Badge variant="outline" className="text-xs">
                                                    Dipilih
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-muted-foreground">
                                                {score.verified_tasks}/{score.total_tasks}
                                            </p>
                                            <p className="font-semibold">{score.total_score.toFixed(1)}%</p>
                                            <GradeBadge grade={score.grade} size="sm" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => navigate(score.date)}
                                            >
                                                Lihat
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Daily Report */}
                {dailyReport && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Laporan CEO Harian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                {dailyReport.is_late ? (
                                    <Badge variant="destructive">TERLAMBAT</Badge>
                                ) : (
                                    <Badge className="bg-green-600">TEPAT WAKTU</Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    Dikirim:{' '}
                                    {new Date(dailyReport.submitted_at).toLocaleString('id-ID', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}{' '}
                                    WITA
                                </span>
                            </div>
                            {getReportFields().map(({ label, value }) => (
                                <div key={label}>
                                    <h4 className="font-semibold text-sm mb-1">{label}:</h4>
                                    <p className="text-sm text-muted-foreground">{value}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {!dailyScore && !dailyReport && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <p>Tidak ada data KPI untuk {user.name} pada tanggal ini</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </CeoLayout>
    );
}
