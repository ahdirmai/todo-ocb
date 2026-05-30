import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, TrendingUp, Users } from 'lucide-react';

interface Score {
  id: string;
  user: {
    id: number;
    name: string;
    email: string;
    job_position: {
      id: string;
      name: string;
    };
  };
  total_score: number;
  grade: string;
  verified_tasks: number;
  total_tasks: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Props {
  allScores: Score[];
  gradeDistribution: Record<string, number>;
  criticalAlerts: Score[];
  lateReports: Array<{ id: string; user: User }>;
  pendingReports: User[];
  date: string;
}

export default function KpiCeoDashboard({
  allScores,
  gradeDistribution,
  criticalAlerts,
  lateReports,
  pendingReports,
  date,
}: Props) {
  const averageScore =
    allScores.length > 0 ? allScores.reduce((sum, s) => sum + s.total_score, 0) / allScores.length : 0;

  return (
    <AppLayout>
      <Head title="KPI Dashboard - CEO" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">KPI Dashboard CEO</h1>
            <p className="text-muted-foreground">
              {new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/kpi/ceo/daily-reports">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Laporan Harian
              </Button>
            </Link>
            <Link href="/kpi/ceo/alerts">
              <Button variant="destructive">
                <AlertCircle className="mr-2 h-4 w-4" />
                Critical Alerts ({criticalAlerts.length + lateReports.length + pendingReports.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{allScores.length}</div>
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
              <div className="text-3xl font-bold">{averageScore.toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Excellent (A+/A)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {(gradeDistribution['A+'] || 0) + (gradeDistribution['A'] || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Critical (D)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{gradeDistribution['D'] || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {['A+', 'A', 'B', 'C', 'D'].map((grade) => (
                <div key={grade} className="text-center">
                  <GradeBadge grade={grade} size="lg" />
                  <p className="text-3xl font-bold mt-2">{gradeDistribution[grade] || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {allScores.length > 0
                      ? ((((gradeDistribution[grade] || 0) / allScores.length) * 100).toFixed(1))
                      : 0}
                    %
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Summary */}
        {(criticalAlerts.length > 0 || lateReports.length > 0 || pendingReports.length > 0) && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalAlerts.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-red-800">Grade D - Perlu Tindakan Segera</p>
                    <p className="text-sm text-red-600">{criticalAlerts.length} manager dengan performa kritis</p>
                  </div>
                  <Badge variant="destructive">{criticalAlerts.length}</Badge>
                </div>
              )}

              {lateReports.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-orange-800">Laporan Terlambat</p>
                    <p className="text-sm text-orange-600">Dikirim setelah 22:30 WITA</p>
                  </div>
                  <Badge variant="destructive" className="bg-orange-600">{lateReports.length}</Badge>
                </div>
              )}

              {pendingReports.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-yellow-800">Laporan Belum Dikirim</p>
                    <p className="text-sm text-yellow-600">{pendingReports.length} manager belum submit laporan</p>
                  </div>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-800">{pendingReports.length}</Badge>
                </div>
              )}

              <div className="pt-2">
                <Link href="/kpi/ceo/alerts">
                  <Button variant="destructive" className="w-full">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Lihat Detail Semua Alert
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allScores
                .sort((a, b) => b.total_score - a.total_score)
                .slice(0, 5)
                .map((score, idx) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{score.user.name}</p>
                        <p className="text-sm text-muted-foreground">{score.user.job_position.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {score.verified_tasks}/{score.total_tasks} task
                      </span>
                      <span className="text-2xl font-bold">{score.total_score.toFixed(2)}%</span>
                      <GradeBadge grade={score.grade} size="lg" />
                    </div>
                  </div>
                ))}

              {allScores.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada data skor untuk hari ini
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
