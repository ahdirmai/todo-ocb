import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, TrendingUp, Plus, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { KpiTaskModal } from '@/components/kpi/kpi-task-modal';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Media {
  id: number;
  name: string;
  original_url: string;
  mime_type: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: number;
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
  is_kpi_task?: boolean;
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
  canGenerateTasks: boolean;
  spvStores?: { id: number; name: string; branch_code: string }[];
}

export default function SpvKpiDashboard({
  selectedDate,
  dateScore,
  dateTasks,
  weeklyScores,
  monthlyScore,
  categoryBreakdown,
  hasTasksForDate,
  canGenerateForDate,
  canGenerateTasks,
  spvStores,
}: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const { auth } = usePage().props as any;
  const positionName = auth?.user?.jobPosition?.name ?? 'SPV';

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

  const getNavigationHref = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    return `/spv/kpi/dashboard?date=${date.toISOString().split('T')[0]}`;
  };

  const prevHref = useMemo(() => getNavigationHref(-1), [selectedDate]);
  const nextHref = useMemo(() => getNavigationHref(1), [selectedDate]);

  const handleGenerateTasks = () => {
    setIsStoreModalOpen(true);
  };

  const handleConfirmGenerate = () => {
    if (!selectedStoreId) {
      return;
    }

    router.post(
      '/spv/kpi/tasks/generate',
      { date: selectedDate, store_id: parseInt(selectedStoreId) },
      {
        onSuccess: () => {
          setIsStoreModalOpen(false);
          setSelectedStoreId('');
        },
      }
    );
  };

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate === todayString;

  return (
    <KpiLayout area="spv">
      <Head title={`KPI Dashboard - ${positionName}`} />

      <div className="space-y-6">
        {/* Header with Date Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">KPI Dashboard</h1>
            <p className="text-muted-foreground">
              {positionName} — Evaluasi Kinerja Harian (34 Lajur Tugas)
            </p>
          </div>
          {!hasTasksForDate && canGenerateForDate && canGenerateTasks && (
            <Button
              variant="outline"
              onClick={handleGenerateTasks}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Task
            </Button>
          )}
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={prevHref}
                className="inline-flex items-center justify-center h-10 px-3 text-sm font-medium rounded-md border border-input hover:bg-accent hover:text-accent-foreground shrink-0"
                aria-label="Hari sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline ml-1">Sebelumnya</span>
              </Link>

              <div className="text-center flex-1 min-w-0">
                <p className="text-sm md:text-lg font-semibold truncate">{formatDate(selectedDate)}</p>
                {isToday && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Hari Ini
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={isToday}
                asChild
                className="shrink-0"
                aria-label="Hari berikutnya"
              >
                <Link href={nextHref}>
                  <span className="hidden md:inline mr-1">Berikutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
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
            <CardTitle>Daily Task ({dateTasks.length})</CardTitle>
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
                          <div className="flex items-start justify-between gap-2 md:gap-4">
                            <p className="flex-1 font-medium">{task.task_name}</p>
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
        area="spv"
        onClose={() => setSelectedTask(null)}
        readOnly={false}
      />

      {/* Store Selection Modal */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Pilih Toko Kunjungan
            </DialogTitle>
            <DialogDescription>
              Pilih satu toko untuk membuat 34 task KPI kunjungan harian. Task hanya bisa dibuat untuk toko yang sudah ditugaskan ke Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih toko..." />
              </SelectTrigger>
              <SelectContent>
                {spvStores?.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {store.branch_code}
                    </span>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(!spvStores || spvStores.length === 0) && (
              <div className="text-center py-6 space-y-3">
                <Store className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Anda belum memiliki toko yang ditugaskan.
                </p>
                <p className="text-xs text-muted-foreground">
                  Hubungi admin untuk assignment toko melalui menu{' '}
                  <span className="font-medium">Manajemen Toko</span> di halaman tim SPV.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsStoreModalOpen(false);
                setSelectedStoreId('');
              }}
            >
              Batal
            </Button>
            {spvStores && spvStores.length > 0 && (
              <Button disabled={!selectedStoreId} onClick={handleConfirmGenerate}>
                <Plus className="mr-2 h-4 w-4" />
                Generate 34 Task KPI
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KpiLayout>
  );
}
