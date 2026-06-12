import KpiLayout from '@/layouts/kpi-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Send, Paperclip, X, Calendar, AlertCircle } from 'lucide-react';

interface ReportTemplate {
  report_date: string;
}

interface ExistingReport {
  recap: string;
  action_plan: string;
  submitted_at: string;
  is_late: boolean;
}

interface Props {
  template: ReportTemplate;
  existingReport: ExistingReport | null;
  canSubmit: boolean;
  isEditing?: boolean;
  reportId?: string;
  selectedDate?: string;
}

export default function GudangKpiReportForm({ template, existingReport, canSubmit, isEditing = false, reportId, selectedDate }: Props) {
  const { data, setData, post, put, processing, errors } = useForm({
    recap: existingReport?.recap || '',
    action_plan: existingReport?.action_plan || '',
    report_date: selectedDate || template.report_date,
    attachments: [] as File[],
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.get('/gudang/kpi/report/create', { date: newDate }, { preserveState: false });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setData('attachments', [...data.attachments, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = data.attachments.filter((_, i) => i !== index);
    setData('attachments', newFiles);
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (isEditing && reportId) {
      put(`/gudang/kpi/report/${reportId}`);
    } else {
      post('/gudang/kpi/report/submit');
    }
  };

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });
  const isNearDeadline = parseInt(currentTime.split(':')[0]) >= 21;

  return (
    <KpiLayout area="gudang">
      <Head title={isEditing ? "Edit Rekap Pengawasan Harian" : "Rekap Pengawasan Harian — Lapor ke CEO"} />

      <div className="space-y-6 mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? 'Edit Rekap Pengawasan Harian' : 'Rekap Pengawasan Harian'}</h1>
            <p className="text-muted-foreground">
              Deadline: 22:30 WITA — Waktu Saat Ini: {currentTime} WITA
            </p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="date-picker" className="text-sm text-muted-foreground whitespace-nowrap">Pilih Tanggal:</Label>
              <Input
                id="date-picker"
                type="date"
                value={data.report_date}
                onChange={handleDateChange}
                className="w-40"
              />
            </div>
          )}
        </div>

        {/* Late Submission Warning */}
        {isNearDeadline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Waktu mendekati deadline 22:30 WITA. Laporan yang dikirim setelah 22:30 akan ditandai TERLAMBAT.
            </AlertDescription>
          </Alert>
        )}

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tanggal Laporan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Laporan untuk tanggal: <span className="font-semibold text-foreground">{data.report_date}</span>
              </p>
            </CardContent>
          </Card>

          {/* Recap Field */}
          <Card>
            <CardHeader>
              <CardTitle>Rekap Pengawasan 5 Divisi Gudang & Kurir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recap" className="text-sm font-medium mb-2 block">
                  Recap BJB, BJM, Gesekan, ACC, Kurir <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="recap"
                  placeholder="Ringkas status kepatuhan KPI setiap divisi, kendala, dan pencapaian hari ini..."
                  value={data.recap}
                  onChange={(e) => setData('recap', e.target.value)}
                  className="min-h-32"
                  maxLength={3000}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {data.recap.length}/3000 karakter
                </div>
                {errors.recap && <p className="text-sm text-red-500 mt-1">{errors.recap}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Action Plan Field */}
          <Card>
            <CardHeader>
              <CardTitle>Action Plan & Follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="action_plan" className="text-sm font-medium mb-2 block">
                  Rencana Aksi <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="action_plan"
                  placeholder="Tindak lanjut yang akan dilakukan untuk perbaikan harian besok..."
                  value={data.action_plan}
                  onChange={(e) => setData('action_plan', e.target.value)}
                  className="min-h-24"
                  maxLength={2000}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {data.action_plan.length}/2000 karakter
                </div>
                {errors.action_plan && <p className="text-sm text-red-500 mt-1">{errors.action_plan}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Lampiran Bukti (Opsional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="attachments" className="text-sm font-medium mb-2 block">
                  Upload file (JPG, PNG, PDF — max 5 MB per file, max 5 file)
                </Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  disabled={data.attachments.length >= 5}
                  className="cursor-pointer"
                />
              </div>

              {/* File List */}
              {data.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">File yang diupload:</p>
                  <div className="space-y-2">
                    {data.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.attachments && <p className="text-sm text-red-500">{errors.attachments}</p>}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.get('/gudang/kpi/reports')}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={processing || !canSubmit}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isEditing ? 'Perbarui Laporan' : 'Kirim Laporan'}
            </Button>
          </div>
        </form>
      </div>
    </KpiLayout>
  );
}
