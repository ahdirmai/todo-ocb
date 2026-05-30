import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, FileText, TrendingUp, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { KpiTaskModal } from '@/components/kpi/kpi-task-modal';
import { useState } from 'react';

interface Media {
  id: number;
  name: string;
  url: string;
  mime_type: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  media: Media[];
}

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
  comments: Comment[];
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
  selectedDate: string;
  dateScore: DailyScore | null;
  dateTasks: Task[];
  weeklyScores: WeeklyScore[];
  monthlyScore: MonthlyScore | null;
  categoryBreakdown: DailyScore['category_breakdown'];
  hasTasksForDate: boolean;
  canGenerateForDate: boolean;
}

export default function OperationalKpiDashboard({
  selectedDate,
  dateScore,
  dateTasks,
  weeklyScores,
  monthlyScore,
  categoryBreakdown,
  hasTasksForDate,
  canGenerateForDate,
}: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const groupedTasks = dateTasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const navigateDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    router.get('/operational/kpi/dashboard', { date: date.toISOString().split('T')[0] }, { preserveState: true });
  };

  const handleGenerateTasks = () => {
    router.post('/operational/kpi/tasks/generate', { date: selectedDate });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <KpiLayout area="operational">
      <Head title="KPI Dashboard - Manager Operasional" />

      <div className="space-y-6">
        {/* Header with Date Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">KPI Dashboard</h1>
            <p className="text-muted-foreground">Manager Operasional - Evaluasi Kinerja Harian</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {!hasTasksForDate && canGenerateForDate && (
              <Button
                variant="outline"
                onClick={handleGenerateTasks}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Task
              </Button>
            )}
            <Link href="/operational/kpi/report/create">
              <Button className="w-full sm:w-auto">
                <FileText className="mr-2 h-4 w-4" />
                Kirim Laporan CEO
              </Button>
            </Link>
          </div>
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Hari </span>Sebelumnya
              </Button>

              <div className="text-center">
                <p className="text-lg font-semibold">{formatDate(selectedDate)}</p>
                {isToday && (
                  <Badge variant="secondary" className="mt-1">
                    Hari Ini
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(1)}
                disabled={isToday}
              >
                Berikutnya<span className="hidden sm:inline"> Hari</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Score Overview */}
        <div className="grid grid-cols-1 gap-3 md:gap-6 md:grid-cols-3">
          {dateScore ? (
            <ScoreCard
              title={isToday ? 'Skor Hari Ini' : 'Skor Tanggal Ini'}
              score={dateScore.total_score}
              grade={dateScore.grade}
              description={`${dateScore.verified_tasks}/${dateScore.total_tasks} task terverifikasi`}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isToday ? 'Skor Hari Ini' : 'Skor Tanggal Ini'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Belum ada skor untuk tanggal ini</p>
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
              <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Date Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Task Tanggal Ini ({dateTasks.length})</CardTitle>
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
                        onClick={() => setSelectedTask(task)}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
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

              {dateTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Belum ada task untuk tanggal ini</p>
                  {canGenerateForDate ? (
                    <p className="text-sm mt-1">Klik tombol "Generate Task" untuk membuat task</p>
                  ) : (
                    <p className="text-sm mt-1">Tidak dapat generate task untuk hari esok</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <KpiTaskModal
        task={selectedTask}
        area="operational"
        onClose={() => setSelectedTask(null)}
      />
    </KpiLayout>
  );
}
