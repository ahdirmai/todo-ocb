import KpiLayout from '@/layouts/kpi-layout';
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
  status_34_tasks: string;
  spv_status: string;
  issues_today: string;
  follow_up: string;
  action_plan: string;
}

interface Props {
  reports: {
    data: Report[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  canCreate: boolean;
}

export default function OperationalKpiReports({ reports, canCreate }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <KpiLayout area="operational">
      <Head title="Riwayat Laporan CEO" />

      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/operational/kpi/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Riwayat Laporan CEO</h1>
              <p className="text-muted-foreground">{reports.total} laporan tersimpan</p>
            </div>
            {canCreate && (
              <Link href="/operational/kpi/report/create">
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
                  <div key={report.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 py-4 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">
                          {new Date(report.report_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </p>
                        {report.is_late ? (
                          <Badge variant="destructive">TERLAMBAT</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">TEPAT WAKTU</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dikirim: {new Date(report.submitted_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })} WITA
                      </p>
                    </div>
                    <div className="flex gap-2">
                    {canCreate && (
                      <Link href={`/operational/kpi/report/${report.id}/edit`}>
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
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto mx-4">
                        <DialogHeader>
                          <DialogTitle>
                            Laporan {new Date(report.report_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedReport && selectedReport.id === report.id && (
                          <div className="space-y-4">
                            {selectedReport.status_34_tasks && (
                              <div>
                                <h3 className="font-semibold mb-2">Status Penyelesaian Task</h3>
                                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                  {selectedReport.status_34_tasks}
                                </div>
                              </div>
                            )}
                            {selectedReport.spv_status && (
                              <div>
                                <h3 className="font-semibold mb-2">Status SPV</h3>
                                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                  {selectedReport.spv_status}
                                </div>
                              </div>
                            )}
                            {selectedReport.issues_today && (
                              <div>
                                <h3 className="font-semibold mb-2">Masalah Hari Ini</h3>
                                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                  {selectedReport.issues_today}
                                </div>
                              </div>
                            )}
                            {selectedReport.follow_up && (
                              <div>
                                <h3 className="font-semibold mb-2">Tindak Lanjut</h3>
                                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                  {selectedReport.follow_up}
                                </div>
                              </div>
                            )}
                            {selectedReport.action_plan && (
                              <div>
                                <h3 className="font-semibold mb-2">Action Plan Besok</h3>
                                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                  {selectedReport.action_plan}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Belum ada laporan yang tersimpan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {reports.last_page > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: reports.last_page }, (_, i) => i + 1).map((page) => (
              <Link key={page} href={`/operational/kpi/reports?page=${page}`}>
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
