import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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

export default function HrKpiDailyDetail({ score, date }: Props) {
  return (
    <AppLayout>
      <Head title={`Skor Harian - ${date}`} />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/operational/kpi/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Skor Harian</h1>
            <p className="text-muted-foreground">{new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
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
    </AppLayout>
  );
}
