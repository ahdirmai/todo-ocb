import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, FileText, TrendingUp } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  category: string;
  task_name: string;
  weight: number;
  description: string;
  is_done: boolean;
  is_verified: boolean;
  comment_count: number;
  has_media: boolean;
}

interface DailyScore {
  total_score: number;
  grade: string;
  completed_tasks: number;
  verified_tasks: number;
  total_tasks: number;
  completed_weight: number;
  category_breakdown: Record<
    string,
    {
      total_tasks: number;
      completed_tasks: number;
      total_weight: number;
      completed_weight: number;
    }
  >;
}

interface WeeklyScore {
  week_start_date: string;
  average_score: number;
  grade: string;
}

interface MonthlyScore {
  month: string;
  final_score: number;
  grade: string;
  consistency_bonus: number;
  has_grade_d: boolean;
}

interface Props {
  todayScore: DailyScore | null;
  todayTasks: Task[];
  weeklyScores: WeeklyScore[];
  monthlyScore: MonthlyScore | null;
  categoryBreakdown: DailyScore['category_breakdown'];
}

export default function HrKpiDashboard({
  todayScore,
  todayTasks,
  weeklyScores,
  monthlyScore,
  categoryBreakdown,
}: Props) {
  const groupedTasks = todayTasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return (
    <KpiLayout area="hr">
      <Head title="KPI Dashboard - Manager HR" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">KPI Dashboard</h1>
            <p className="text-muted-foreground">Manager HR - Evaluasi Kinerja Harian</p>
          </div>
          <Link href="/hr/kpi/report/create">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Kirim Laporan CEO
            </Button>
          </Link>
        </div>

        {/* Score Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          {todayScore ? (
            <ScoreCard
              title="Skor Hari Ini"
              score={todayScore.total_score}
              grade={todayScore.grade}
              description={`${todayScore.verified_tasks}/${todayScore.total_tasks} task terverifikasi`}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Skor Hari Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Belum ada skor untuk hari ini</p>
              </CardContent>
            </Card>
          )}

          {weeklyScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rata-rata Minggu Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{weeklyScores[0].average_score.toFixed(2)}%</span>
                  <GradeBadge grade={weeklyScores[0].grade} />
                </div>
              </CardContent>
            </Card>
          )}

          {monthlyScore && (
            <Card>
              <CardHeader>
                <CardTitle>Skor Bulan Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{monthlyScore.final_score.toFixed(2)}%</span>
                    <GradeBadge grade={monthlyScore.grade} />
                  </div>
                  {monthlyScore.consistency_bonus > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      +{monthlyScore.consistency_bonus}% Bonus Konsistensi
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown && Object.keys(categoryBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(categoryBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {data.completed_weight.toFixed(0)}/{data.total_weight.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{
                          width: `${(data.completed_weight / data.total_weight) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data.completed_tasks}/{data.total_tasks} task
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Task Hari Ini ({todayTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([category, tasks]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">{category}</h3>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="mt-1">
                          {task.is_verified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-medium">{task.task_name}</p>
                            <Badge variant="secondary">{task.weight}%</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {task.is_verified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Terverifikasi
                              </Badge>
                            )}
                            {task.is_done && !task.is_verified && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                Selesai - Perlu Bukti
                              </Badge>
                            )}
                            {!task.is_done && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                Belum Selesai
                              </Badge>
                            )}
                            {task.comment_count > 0 && (
                              <span>
                                {task.comment_count} komentar {task.has_media && '📎'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {todayTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Belum ada task untuk hari ini</p>
                  <p className="text-sm mt-1">Task akan digenerate otomatis setiap hari jam 00:01 WITA</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </KpiLayout>
  );
}
