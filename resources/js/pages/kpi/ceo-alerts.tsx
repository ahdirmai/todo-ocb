import CeoLayout from '@/layouts/ceo-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { AlertCircle, Clock, FileX, ChevronLeft, ChevronRight } from 'lucide-react';

interface Score {
    id: string;
    user: {
        id: number;
        name: string;
        email: string;
        job_position: {
            name: string;
        } | null;
    };
    total_score: number;
    grade: string;
    verified_tasks: number;
    total_tasks: number;
}

interface UserItem {
    id: number;
    name: string;
    email: string;
}

interface Props {
    gradeDAlerts: Score[];
    lateReports: Array<{ id: string; user: UserItem; submitted_at: string }>;
    missingReports: UserItem[];
    date: string;
}

export default function KpiCeoAlerts({ gradeDAlerts, lateReports, missingReports, date }: Props) {
    const totalAlerts = gradeDAlerts.length + lateReports.length + missingReports.length;

    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);

    const nextDate = new Date(date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);

    const navigate = (d: string) => {
        router.get('/kpi/ceo/alerts', { date: d }, { preserveScroll: true });
    };

    return (
        <CeoLayout>
            <Head title="Critical Alerts - CEO" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <AlertCircle className="h-7 w-7 text-red-600" />
                        Critical Alerts
                    </h1>
                    <p className="text-muted-foreground text-sm">{totalAlerts} total alerts ditemukan</p>
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

                {/* Alert Summary */}
                <div className="grid gap-3 md:gap-6 md:grid-cols-3">
                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-400">
                                Grade D - Kritis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">{gradeDAlerts.length}</div>
                            <p className="text-xs text-red-600 mt-1">Perlu tindakan segera</p>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-400">
                                Laporan Terlambat
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-600">{lateReports.length}</div>
                            <p className="text-xs text-orange-600 mt-1">Setelah 22:30 WITA</p>
                        </CardContent>
                    </Card>

                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                                Laporan Belum Masuk
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-600">{missingReports.length}</div>
                            <p className="text-xs text-yellow-600 mt-1">Deadline 22:30 WITA</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Grade D Alerts */}
                {gradeDAlerts.length > 0 && (
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Grade D - Performance Kritis ({gradeDAlerts.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {gradeDAlerts.map((score) => (
                                    <div
                                        key={score.id}
                                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold">{score.user.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {score.user.job_position?.name ?? '-'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Task Verified</p>
                                                <p className="font-semibold">
                                                    {score.verified_tasks}/{score.total_tasks}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Skor</p>
                                                <p className="text-2xl font-bold text-red-600">
                                                    {score.total_score.toFixed(1)}%
                                                </p>
                                            </div>
                                            <GradeBadge grade={score.grade} size="lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                                <p className="text-sm text-red-800 font-medium">Tindakan yang diperlukan:</p>
                                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                                    <li>SP2/SP3 dan evaluasi posisi</li>
                                    <li>Meeting 1-on-1 untuk memahami kendala</li>
                                    <li>Buat action plan perbaikan 30 hari</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Late Reports */}
                {lateReports.length > 0 && (
                    <Card className="border-orange-200">
                        <CardHeader>
                            <CardTitle className="text-orange-700 flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Laporan Terlambat ({lateReports.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {lateReports.map((report) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-semibold">{report.user.name}</p>
                                            <p className="text-sm text-muted-foreground">{report.user.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge className="bg-orange-600">Lewat 22:30 WITA</Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(report.submitted_at).toLocaleTimeString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}{' '}
                                                WITA
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Missing Reports */}
                {missingReports.length > 0 && (
                    <Card className="border-yellow-200">
                        <CardHeader>
                            <CardTitle className="text-yellow-700 flex items-center gap-2">
                                <FileX className="h-5 w-5" />
                                Laporan Belum Dikirim ({missingReports.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {missingReports.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-semibold">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Badge variant="outline" className="border-yellow-600 text-yellow-800">
                                            Belum Submit
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    Reminder: Laporan harus dikirim sebelum 22:30 WITA setiap hari
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* No Alerts */}
                {totalAlerts === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="text-green-600 mb-4">
                                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Tidak Ada Alert Kritis</h3>
                            <p className="text-muted-foreground">Semua manager perform dengan baik untuk tanggal ini</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </CeoLayout>
    );
}
