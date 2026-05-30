import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react';

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
  submitted_at: string;
  is_late: boolean;
}

interface Props {
  reports: Report[];
  date: string;
}

export default function KpiCeoReports({ reports, date }: Props) {
  return (
    <AppLayout>
      <Head title="Laporan Harian - CEO" />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/kpi/ceo/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Laporan Harian CEO</h1>
            <p className="text-muted-foreground">
              {new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reports.length}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
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

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
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
                      <Badge variant="default" className="bg-green-600">
                        TEPAT WAKTU
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
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
                <div>
                  <h4 className="font-semibold text-sm mb-1">Status Task:</h4>
                  <p className="text-sm">{report.status_34_tasks}</p>
                </div>

                {report.spv_status && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Status SPV:</h4>
                    <p className="text-sm">{report.spv_status}</p>
                  </div>
                )}

                {report.issues_today && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Masalah Hari Ini:</h4>
                    <p className="text-sm">{report.issues_today}</p>
                  </div>
                )}

                {report.follow_up && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Tindak Lanjut:</h4>
                    <p className="text-sm">{report.follow_up}</p>
                  </div>
                )}

                {report.action_plan && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Rencana Aksi Besok:</h4>
                    <p className="text-sm">{report.action_plan}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {reports.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Belum ada laporan yang masuk untuk hari ini</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
