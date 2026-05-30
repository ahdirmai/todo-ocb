import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface WeeklyScore {
  average_score: number;
  grade: string;
  daily_scores: Array<{
    date: string;
    score: number;
    grade: string;
  }>;
}

interface Props {
  score: WeeklyScore | null;
  weekStart: string;
}

export default function HrKpiWeeklyDetail({ score, weekStart }: Props) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <AppLayout>
      <Head title={`Skor Mingguan - ${weekStart}`} />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/operational/kpi/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Skor Mingguan</h1>
            <p className="text-muted-foreground">
              {new Date(weekStart).toLocaleDateString('id-ID')} - {weekEnd.toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        {score ? (
          <>
            <ScoreCard
              title="Rata-rata Skor Mingguan"
              score={score.average_score}
              grade={score.grade}
              description="Rata-rata dari 7 hari (Senin-Minggu)"
            />

            <Card>
              <CardHeader>
                <CardTitle>Skor Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {score.daily_scores?.map((day, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                      <span className="font-medium">
                        {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold">{day.score.toFixed(2)}%</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          day.grade === 'A+' || day.grade === 'A' ? 'bg-green-100 text-green-800' :
                          day.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          day.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {day.grade}
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
              Belum ada data skor untuk minggu ini
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
