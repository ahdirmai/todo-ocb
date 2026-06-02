import CeoLayout from '@/layouts/ceo-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Report {
    id: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    status_34_tasks: string;
    spv_status: string;
    issues_today: string;
    follow_up: string;
    action_plan: string;
    report_data: Record<string, string> | null;
    submitted_at: string;
    is_late: boolean;
}

interface Props {
    reports: Report[];
    date: string;
}

export default function KpiCeoReports({ reports, date }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const nextDate = new Date(date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const navigate = (d: string) => {
        router.get('/kpi/ceo/daily-reports', { date: d }, { preserveScroll: true });
    };

    const reportData = (report: Report): Array<{ label: string; value: string }> => {
        if (report.report_data && Object.keys(report.report_data).length > 0) {
            const labels: Record<string, string> = {
                absensi: 'Absensi',
                disiplin: 'Disiplin',
                performance_sales: 'Performance Sales',
                compliance: 'Compliance',
                training: 'Training',
                recruitment: 'Recruitment',
                notes: 'Catatan',
            };
            return Object.entries(report.report_data)
                .filter(([, v]) => v)
                .map(([k, v]) => ({ label: labels[k] ?? k, value: v }));
        }
        const fields = [
            { label: 'Status Task', value: report.status_34_tasks },
            { label: 'Status SPV', value: report.spv_status },
            { label: 'Masalah Hari Ini', value: report.issues_today },
            { label: 'Tindak Lanjut', value: report.follow_up },
            { label: 'Rencana Aksi Besok', value: report.action_plan },
        ];
        return fields.filter((f) => f.value);
    };

    return (
        <CeoLayout>
            <Head title="Laporan Harian - CEO" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Laporan Harian CEO</h1>
                    <p className="text-muted-foreground text-sm">Laporan yang dikirim oleh Manager HR & Operasional</p>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(prevDateStr)}
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
                                onClick={() => navigate(nextDateStr)}
                                disabled={isToday}
                                className="shrink-0"
                            >
                                <span className="hidden md:inline mr-1">Berikutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid gap-3 md:gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{reports.length}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Tepat Waktu
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {reports.filter((r) => !r.is_late).length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Terlambat
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">
                                {reports.filter((r) => r.is_late).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Reports List */}
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card key={report.id} className={report.is_late ? 'border-red-200' : ''}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{report.user.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{report.user.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {report.is_late ? (
                                            <Badge variant="destructive">TERLAMBAT</Badge>
                                        ) : (
                                            <Badge className="bg-green-600">TEPAT WAKTU</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(report.submitted_at).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}{' '}
                                            WITA
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {reportData(report).map(({ label, value }) => (
                                    <div key={label}>
                                        <h4 className="font-semibold text-sm mb-1">{label}:</h4>
                                        <p className="text-sm text-muted-foreground">{value}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}

                    {reports.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <p>Belum ada laporan yang masuk untuk tanggal ini</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </CeoLayout>
    );
}
