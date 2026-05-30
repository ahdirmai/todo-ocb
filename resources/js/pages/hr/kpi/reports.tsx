import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Eye } from 'lucide-react';
import { useState } from 'react';

interface Report {
  id: string;
  report_date: string;
  submitted_at: string;
  is_late: boolean;
  report_data: {
    absensi?: any;
    disiplin?: any;
    performance_sales?: any;
    compliance?: any;
    training?: any;
    recruitment?: any;
  };
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

export default function HrKpiReports({ reports, canCreate }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <KpiLayout area="hr">
      <Head title="Riwayat Laporan CEO" />

      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/hr/kpi/dashboard">
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
              <Link href="/hr/kpi/report/create">
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
                            {selectedReport.report_data?.absensi && (
                              <div>
                                <h3 className="font-semibold mb-2">1. ABSENSI HARI INI</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p>Hadir Tepat Waktu: {selectedReport.report_data.absensi.hadir_tepat_waktu}</p>
                                  <p>Telat: {selectedReport.report_data.absensi.telat}</p>
                                  <p>Alpha: {selectedReport.report_data.absensi.alpha}</p>
                                  <p>Sakit/Izin: {selectedReport.report_data.absensi.sakit_izin}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.report_data?.disiplin && (
                              <div>
                                <h3 className="font-semibold mb-2">2. DISIPLIN</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p>SP1: {selectedReport.report_data.disiplin.sp1}</p>
                                  <p>SP2: {selectedReport.report_data.disiplin.sp2}</p>
                                  <p>SP3: {selectedReport.report_data.disiplin.sp3}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.report_data?.performance_sales && (
                              <div>
                                <h3 className="font-semibold mb-2">3. PERFORMANCE SALES</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p className="font-medium">Top 5:</p>
                                  <p className="whitespace-pre-wrap">{selectedReport.report_data.performance_sales.top_5}</p>
                                  <p className="font-medium mt-2">Bottom 5:</p>
                                  <p className="whitespace-pre-wrap">{selectedReport.report_data.performance_sales.bottom_5}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.report_data?.compliance && (
                              <div>
                                <h3 className="font-semibold mb-2">4. COMPLIANCE</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p className="font-medium">Minus Setoran:</p>
                                  <p className="whitespace-pre-wrap">{selectedReport.report_data.compliance.minus_setoran}</p>
                                  <p className="font-medium mt-2">Minus Audit:</p>
                                  <p className="whitespace-pre-wrap">{selectedReport.report_data.compliance.minus_audit}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.report_data?.training && (
                              <div>
                                <h3 className="font-semibold mb-2">5. TRAINING</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p>In-Store Selesai: {selectedReport.report_data.training.instore_selesai}</p>
                                  <p>Lulus Hafalan: {selectedReport.report_data.training.lulus_hafalan}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.report_data?.recruitment && (
                              <div>
                                <h3 className="font-semibold mb-2">6. RECRUITMENT</h3>
                                <div className="text-sm space-y-1 bg-muted p-3 rounded">
                                  <p>Pool Pengganti: {selectedReport.report_data.recruitment.pool_pengganti}</p>
                                  <p>Posisi Kosong: {selectedReport.report_data.recruitment.posisi_kosong}</p>
                                </div>
                              </div>
                            )}
                            {selectedReport.action_plan && (
                              <div>
                                <h3 className="font-semibold mb-2">7. ACTION PLAN BESOK</h3>
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
              <Link key={page} href={`/hr/kpi/reports?page=${page}`}>
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
