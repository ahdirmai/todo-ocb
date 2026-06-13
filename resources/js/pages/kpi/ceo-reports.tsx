import CeoLayout from '@/layouts/ceo-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useState } from 'react';
import DynamicReportDetail from '@/components/kpi/dynamic-report-detail';
import type { ReportField } from '@/components/kpi/dynamic-report-form';

interface Report {
    id: string;
    user: {
        id: number;
        name: string;
        email: string;
        job_position: { name: string } | null;
    };
    fields: Record<string, unknown>;
    report_fields: ReportField[];
    submitted_at: string;
    is_late: boolean;
}

interface Props {
    reports: Report[];
    date: string;
}

export default function KpiCeoReports({ reports, date }: Props) {
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const today = (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })();
    const isToday = date === today;

    const addDays = (dateStr: string, days: number): string => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d + days);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const prevDateStr = addDays(date, -1);
    const nextDateStr = addDays(date, 1);

    const prevHref = `/kpi/ceo/daily-reports?date=${prevDateStr}`;
    const nextHref = `/kpi/ceo/daily-reports?date=${nextDateStr}`;

    const getNested = (obj: Record<string, unknown>, key: string): string => {
        let current: unknown = obj;
        for (const part of key.split('.')) {
            if (current == null || typeof current !== 'object') return '';
            current = (current as Record<string, unknown>)[part];
        }
        return current == null ? '' : String(current);
    };

    const reportData = (report: Report): Array<{ label: string; value: string }> => {
        return report.report_fields
            .map((f) => ({ label: f.field_label, value: getNested(report.fields, f.field_key) }))
            .filter((f) => f.value);
    };

    return (
        <CeoLayout>
            <Head title="Laporan Harian - CEO" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Laporan Harian CEO</h1>
                    <p className="text-muted-foreground text-sm">Laporan yang dikirim oleh Manager HR, Operasional & Gudang</p>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Link
                                href={prevHref}
                                className="inline-flex items-center justify-center h-10 px-3 text-sm font-medium rounded-md border border-input hover:bg-accent hover:text-accent-foreground shrink-0"
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
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isToday}
                                asChild
                                className="shrink-0"
                            >
                                <Link href={nextHref}>
                                    <span className="hidden md:inline mr-1">Berikutnya</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
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
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {reportData(report).slice(0, 2).map(({ label, value }) => (
                                        <div key={label}>
                                            <h4 className="font-semibold text-sm mb-1">{label}:</h4>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{value}</p>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedReport(report)}
                                    className="w-full"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Lihat Laporan Harian
                                </Button>
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

                {/* Report Detail Modal */}
                <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                    {selectedReport && (
                        <DialogContent className="mx-4 max-h-[80vh] max-w-2xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    Laporan {selectedReport.user.name}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    <p>{selectedReport.user.email}</p>
                                    <p>
                                        {new Date(selectedReport.submitted_at).toLocaleString('id-ID', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}{' '}
                                        WITA
                                    </p>
                                </div>
                                <div className="border-t pt-4">
                                    {selectedReport.report_fields.length > 0 ? (
                                        <DynamicReportDetail
                                            fields={selectedReport.fields}
                                            reportFields={selectedReport.report_fields}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            Laporan tidak memiliki isi detail
                                        </p>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>
        </CeoLayout>
    );
}
