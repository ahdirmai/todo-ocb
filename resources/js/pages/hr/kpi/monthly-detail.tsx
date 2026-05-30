import KpiLayout from '@/layouts/kpi-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreCard } from '@/components/kpi/score-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyScore {
  average_score: number;
  consistency_bonus: number;
  final_score: number;
  grade: string;
  has_grade_d: boolean;
  weekly_scores: Array<{
    week_start: string;
    week_end: string;
    score: number;
    grade: string;
  }>;
}

interface Props {
  score: MonthlyScore | null;
  month: string;
}

export default function HrKpiMonthlyDetail({ score, month }: Props) {
  const monthDate = new Date(month);

  const navigateMonth = (months: number) => {
    const currentMonth = new Date(month);
    currentMonth.setMonth(currentMonth.getMonth() + months);
    router.get(`/hr/kpi/monthly/${currentMonth.toISOString().split('T')[0]}`, {}, { preserveState: true });
  };

  return (
    <KpiLayout area="hr">
      <Head title={`Skor Bulanan - ${month}`} />

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
              <h1 className="text-2xl font-bold">Skor Bulanan</h1>
              <p className="text-muted-foreground">
                {monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
                Bulan Sebelumnya
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                Bulan Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {score ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <ScoreCard
                title="Skor Akhir Bulan Ini"
                score={score.final_score}
                grade={score.grade}
                description={`Rata-rata ${score.average_score.toFixed(2)}% + Bonus ${score.consistency_bonus}%`}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Bonus Konsistensi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">+{score.consistency_bonus}%</span>
                    </div>
                    {score.has_grade_d ? (
                      <Badge variant="destructive">Tidak dapat bonus (ada grade D)</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Bonus diperoleh (tidak ada grade D)</Badge>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Bonus +5% diberikan jika tidak ada grade D dalam sebulan
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Skor Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {score.weekly_scores?.map((week, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 md:gap-4 py-3 border-b last:border-0">
                      <span className="text-sm sm:text-base font-medium">
                        <span className="hidden sm:inline">Minggu {idx + 1}: </span>
                        <span className="sm:hidden">M{idx + 1}: </span>
                        {new Date(week.week_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(week.week_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-lg font-bold">{week.score.toFixed(2)}%</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          week.grade === 'A+' || week.grade === 'A' ? 'bg-green-100 text-green-800' :
                          week.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          week.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {week.grade}
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
              Belum ada data skor untuk bulan ini
            </CardContent>
          </Card>
        )}
      </div>
    </KpiLayout>
  );
}
