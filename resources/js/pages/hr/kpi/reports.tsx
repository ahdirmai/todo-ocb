import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText } from 'lucide-react';

interface Report {
  id: string;
  report_date: string;
  submitted_at: string;
  is_late: boolean;
  status_34_tasks: string;
}

interface Props {
  reports: {
    data: Report[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export default function HrKpiReports({ reports }: Props) {
  return (
    <KpiLayout area="hr">
      <Head title="Riwayat Laporan CEO" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr/kpi/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Riwayat Laporan CEO</h1>
              <p className="text-muted-foreground">{reports.total} laporan tersimpan</p>
            </div>
          </div>
          <Link href="/hr/kpi/report/create">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Buat Laporan Baru
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.data.length > 0 ? (
              <div className="space-y-3">
                {reports.data.map((report) => (
                  <div key={report.id} className="flex items-start justify-between py-4 border-b last:border-0">
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
                      <p className="text-sm text-muted-foreground line-clamp-2">{report.status_34_tasks}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dikirim: {new Date(report.submitted_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })} WITA
                      </p>
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
