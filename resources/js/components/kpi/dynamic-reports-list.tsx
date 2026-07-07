import KpiLayout from '@/layouts/kpi-layout';
import DynamicReportDetail from '@/components/kpi/dynamic-report-detail';
import type { ReportField } from '@/components/kpi/dynamic-report-form';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Eye, Pencil } from 'lucide-react';
import { useState } from 'react';

interface Report {
  id: string;
  report_date: string;
  submitted_at: string;
  is_late: boolean;
  fields: Record<string, unknown>;
  store_name?: string;
  store_code?: string;
  user?: {
    id: number;
    name: string;
    jobPosition?: {
      id: string;
      name: string;
    };
  };
}

export interface ReportsPageProps {
  reports: {
    data: Report[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  canCreate: boolean;
  reportFields: ReportField[];
}

interface Props extends ReportsPageProps {
  area: 'hr' | 'operational' | 'gudang' | 'spv';
}

export default function DynamicReportsList({ reports, canCreate, reportFields, area }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const areaLabel = {
    hr: 'Manager HR',
    operational: 'Manager Operasional',
    gudang: 'Manager Gudang',
    spv: 'SPV Unit 1',
  };

  return (
    <KpiLayout area={area}>
      <Head title={`Riwayat Laporan ${areaLabel[area]}`} />

      <div className="space-y-6">
        <div className="space-y-4">
          <Link href={`/${area}/kpi/dashboard`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Riwayat Laporan {areaLabel[area]}</h1>
              <p className="text-muted-foreground">{reports.total} laporan tersimpan</p>
            </div>
            {canCreate && (
              <Link href={`/${area}/kpi/report/create`}>
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Buat Laporan Baru
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.data.length > 0 ? (
              <div className="space-y-3">
                {reports.data.map((report) => (
                  <div key={report.id} className="flex flex-col items-start gap-3 border-b py-4 last:border-0 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div>
                          <p className="font-semibold">
                            {new Date(report.report_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                          </p>
                          {report.user && (
                            <p className="text-xs text-muted-foreground">
                              {report.user.name} — {report.user.jobPosition?.name || '-'}
                              {report.store_name && (
                                <> — <span className="font-medium">{report.store_name}</span>{report.store_code && <> ({report.store_code})</>}</>
                              )}
                            </p>
                          )}
                        </div>
                        {report.is_late ? (
                          <Badge variant="destructive">TERLAMBAT</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">TEPAT WAKTU</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dikirim: {new Date(report.submitted_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })} WITA
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canCreate && report.report_date.slice(0, 10) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }) && (
                        <Link href={`/${area}/kpi/report/${report.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="mx-4 max-h-[80vh] max-w-3xl overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Laporan {new Date(report.report_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                              {report.user && (
                                <span className="block text-sm font-normal text-muted-foreground">
                                  {report.user.name} — {report.user.jobPosition?.name || '-'}
                                  {report.store_name && (
                                    <> — {report.store_name}{report.store_code && <> ({report.store_code})</>}</>
                                  )}
                                </span>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          {selectedReport && selectedReport.id === report.id && (
                            <DynamicReportDetail
                              fields={selectedReport.fields ?? {}}
                              reportFields={reportFields}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Belum ada laporan yang tersimpan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {reports.last_page > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: reports.last_page }, (_, i) => i + 1).map((page) => (
              <Link key={page} href={`/${area}/kpi/reports?page=${page}`}>
                <Button variant={page === reports.current_page ? 'default' : 'outline'} size="sm">
                  {page}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </KpiLayout>
  );
}
