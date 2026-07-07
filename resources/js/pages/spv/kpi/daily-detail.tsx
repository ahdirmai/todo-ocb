import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyScore {
  total_score: number;
  grade: string;
  completed_tasks: number;
  verified_tasks: number;
  total_tasks: number;
  completed_weight: number;
  category_breakdown: Record<string, any>;
  task_details: Array<{
    task_name: string;
    category: string;
    weight: number;
    completed: boolean;
    verified: boolean;
  }>;
}

interface Props {
  score: DailyScore | null;
  date: string;
}

export default function SpvKpiDailyDetail({ score, date }: Props) {
  const navigateDate = (days: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    router.get(`/spv/kpi/daily/${currentDate.toISOString().split('T')[0]}`, {}, { preserveState: true });
  };

  return (
    <KpiLayout area="spv">
      <Head title={`Skor Harian - ${date}`} />

      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/spv/kpi/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Skor Harian</h1>
              <p className="text-muted-foreground">{new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(-1)}
                className="shrink-0"
                aria-label="Hari sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline ml-1">Sebelumnya</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(1)}
                className="shrink-0"
                aria-label="Hari berikutnya"
              >
                <span className="hidden md:inline mr-1">Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {score ? (
          <>
            <ScoreCard
              title="Total Skor"
              score={score.total_score}
              grade={score.grade}
              description={`${score.verified_tasks}/${score.total_tasks} task terverifikasi (${score.completed_weight.toFixed(2)}% bobot)`}
            />

            <Card>
              <CardHeader>
                <CardTitle>Detail Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {score.task_details?.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{task.task_name}</p>
                        <p className="text-sm text-muted-foreground">{task.category}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{task.weight}%</span>
                        <span className={`text-sm ${task.verified ? 'text-green-600' : 'text-gray-400'}`}>
                          {task.verified ? '✓ Verified' : '○ Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada data skor untuk tanggal ini
            </CardContent>
          </Card>
        )}
      </div>
    </KpiLayout>
  );
}
