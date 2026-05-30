import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from '@/components/kpi/grade-badge';

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
  completed_tasks: number;
  verified_tasks: number;
  total_tasks: number;
  completed_weight: number;
}

interface Props {
  scores: Score[];
  date: string;
}

export default function KpiAdminScores({ scores, date }: Props) {
  const gradeOrder = { 'A+': 1, A: 2, B: 3, C: 4, D: 5 };

  return (
    <AppLayout>
      <Head title="Semua Skor KPI - Admin" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Semua Skor KPI</h1>
          <p className="text-muted-foreground">
            {new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{scores.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Skor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {scores.length > 0
                  ? (scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length).toFixed(2)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Grade A/A+</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {scores.filter((s) => s.grade === 'A+' || s.grade === 'A').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Grade D</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {scores.filter((s) => s.grade === 'D').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scores Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Skor Harian</CardTitle>
          </CardHeader>
          <CardContent>
            {scores.length > 0 ? (
              <div className="space-y-2">
                {scores
                  .sort((a, b) => b.total_score - a.total_score)
                  .map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold">{score.user.name}</p>
                            <p className="text-sm text-muted-foreground">{score.user.job_position.name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Task Terverifikasi</p>
                          <p className="font-semibold">
                            {score.verified_tasks}/{score.total_tasks}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Bobot</p>
                          <p className="font-semibold">{score.completed_weight.toFixed(2)}%</p>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <p className="text-sm text-muted-foreground">Skor</p>
                          <p className="text-2xl font-bold">{score.total_score.toFixed(2)}%</p>
                        </div>

                        <GradeBadge grade={score.grade} size="lg" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Belum ada data skor untuk hari ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
