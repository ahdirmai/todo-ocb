import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const navigateWeek = (weeks: number) => {
    const currentWeek = new Date(weekStart);
    currentWeek.setDate(currentWeek.getDate() + (weeks * 7));
    router.get(`/hr/kpi/weekly/${currentWeek.toISOString().split('T')[0]}`, {}, { preserveState: true });
  };

  return (
    <KpiLayout area="hr">
      <Head title={`Skor Mingguan - ${weekStart}`} />

      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/hr/kpi/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Skor Mingguan</h1>
              <p className="text-muted-foreground">
                {new Date(weekStart).toLocaleDateString('id-ID')} - {weekEnd.toLocaleDateString('id-ID')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek(-1)}
                className="shrink-0"
                aria-label="Minggu sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline ml-1">Sebelumnya</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek(1)}
                className="shrink-0"
                aria-label="Minggu berikutnya"
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
                    <div key={idx} className="flex items-center justify-between gap-2 md:gap-4 py-3 border-b last:border-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-sm sm:text-base font-medium">
                          {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
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
    </KpiLayout>
  );
}
