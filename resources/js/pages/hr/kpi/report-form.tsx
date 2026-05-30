import KpiLayout from '@/layouts/kpi-layout';
import { Head, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Send } from 'lucide-react';

interface ReportTemplate {
  report_date: string;
  total_tasks: number;
  completed_tasks: number;
  verified_tasks: number;
  completion_percentage: number;
  total_score: number;
  grade: string;
}

interface ExistingReport {
  status_34_tasks: string;
  spv_status: string;
  issues_today: string;
  follow_up: string;
  action_plan: string;
  submitted_at: string;
  is_late: boolean;
}

interface Props {
  template: ReportTemplate;
  existingReport: ExistingReport | null;
}

export default function HrKpiReportForm({ template, existingReport }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    status_34_tasks: existingReport?.status_34_tasks || '',
    spv_status: existingReport?.spv_status || '',
    issues_today: existingReport?.issues_today || '',
    follow_up: existingReport?.follow_up || '',
    action_plan: existingReport?.action_plan || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/hr/kpi/report/submit');
  };

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });
  const isNearDeadline = parseInt(currentTime.split(':')[0]) >= 21;

  return (
    <KpiLayout area="hr">
      <Head title="Laporan Harian CEO - Manager HR" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Laporan Harian CEO</h1>
          <p className="text-muted-foreground">
            Deadline: 22:30 WITA - Waktu Saat Ini: {currentTime} WITA
          </p>
        </div>

        {/* Warning if near deadline */}
        {isNearDeadline && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Mendekati deadline! Kirim laporan sebelum 22:30 WITA untuk menghindari status terlambat.
            </AlertDescription>
          </Alert>
        )}

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Kinerja Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Task</p>
                <p className="text-2xl font-bold">{template.total_tasks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Terverifikasi</p>
                <p className="text-2xl font-bold">{template.verified_tasks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skor</p>
                <p className="text-2xl font-bold">{template.total_score.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="text-2xl font-bold">{template.grade}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Isi Laporan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Tasks */}
              <div className="space-y-2">
                <Label htmlFor="status_34_tasks">
                  Status Penyelesaian Task <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="status_34_tasks"
                  value={data.status_34_tasks}
                  onChange={(e) => setData('status_34_tasks', e.target.value)}
                  placeholder={`Contoh: Hari ini ${template.verified_tasks} dari ${template.total_tasks} task terverifikasi dengan total bobot ${template.total_score.toFixed(2)}%. Grade: ${template.grade}.`}
                  rows={3}
                  className={errors.status_34_tasks ? 'border-red-500' : ''}
                />
                {errors.status_34_tasks && (
                  <p className="text-sm text-red-500">{errors.status_34_tasks}</p>
                )}
              </div>

              {/* SPV Status */}
              <div className="space-y-2">
                <Label htmlFor="spv_status">Status SPV</Label>
                <Textarea
                  id="spv_status"
                  value={data.spv_status}
                  onChange={(e) => setData('spv_status', e.target.value)}
                  placeholder="Jumlah SPV, SPV yang tuntas 100%, SPV di bawah 85%, dll."
                  rows={3}
                />
              </div>

              {/* Issues */}
              <div className="space-y-2">
                <Label htmlFor="issues_today">Masalah Hari Ini</Label>
                <Textarea
                  id="issues_today"
                  value={data.issues_today}
                  onChange={(e) => setData('issues_today', e.target.value)}
                  placeholder="Kendala atau masalah yang dihadapi hari ini"
                  rows={3}
                />
              </div>

              {/* Follow Up */}
              <div className="space-y-2">
                <Label htmlFor="follow_up">Tindak Lanjut</Label>
                <Textarea
                  id="follow_up"
                  value={data.follow_up}
                  onChange={(e) => setData('follow_up', e.target.value)}
                  placeholder="Tindakan yang akan dilakukan untuk mengatasi masalah"
                  rows={3}
                />
              </div>

              {/* Action Plan */}
              <div className="space-y-2">
                <Label htmlFor="action_plan">Rencana Aksi Besok</Label>
                <Textarea
                  id="action_plan"
                  value={data.action_plan}
                  onChange={(e) => setData('action_plan', e.target.value)}
                  placeholder="Target dan rencana untuk esok hari"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Batal
            </Button>
            <Button type="submit" disabled={processing}>
              <Send className="mr-2 h-4 w-4" />
              {processing ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </div>
        </form>

        {/* Existing Report Info */}
        {existingReport && (
          <Alert>
            <AlertDescription>
              Laporan sudah pernah dikirim hari ini pada {existingReport.submitted_at}.
              {existingReport.is_late && ' (TERLAMBAT)'}
              <br />
              Form ini akan memperbarui laporan yang sudah ada.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </KpiLayout>
  );
}
