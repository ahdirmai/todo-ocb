import KpiLayout from '@/layouts/kpi-layout';
import { Head, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Send, Paperclip, X } from 'lucide-react';

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
  report_data: {
    absensi: {
      hadir_tepat_waktu: string;
      telat: string;
      alpha: string;
      sakit_izin: string;
    };
    disiplin: {
      sp1: string;
      sp2: string;
      sp3: string;
    };
    performance_sales: {
      top_5: string;
      bottom_5: string;
    };
    compliance: {
      minus_setoran: string;
      minus_audit: string;
    };
    training: {
      instore_selesai: string;
      lulus_hafalan: string;
    };
    recruitment: {
      pool_pengganti: string;
      posisi_kosong: string;
    };
  };
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
    report_data: existingReport?.report_data || {
      absensi: {
        hadir_tepat_waktu: '',
        telat: '',
        alpha: '',
        sakit_izin: '',
      },
      disiplin: {
        sp1: '',
        sp2: '',
        sp3: '',
      },
      performance_sales: {
        top_5: '',
        bottom_5: '',
      },
      compliance: {
        minus_setoran: '',
        minus_audit: '',
      },
      training: {
        instore_selesai: '',
        lulus_hafalan: '',
      },
      recruitment: {
        pool_pengganti: '',
        posisi_kosong: '',
      },
    },
    action_plan: existingReport?.action_plan || '',
    attachments: [] as File[],
  });

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
          <h1 className="text-2xl font-bold">DASHBOARD HARIAN MANAGER HR</h1>
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
          {/* Absensi */}
          <Card>
            <CardHeader>
              <CardTitle>1. ABSENSI HARI INI (210 karyawan)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hadir_tepat_waktu">Hadir Tepat Waktu <span className="text-red-500">*</span></Label>
                  <Input
                    id="hadir_tepat_waktu"
                    value={data.report_data.absensi.hadir_tepat_waktu}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      absensi: { ...data.report_data.absensi, hadir_tepat_waktu: e.target.value }
                    })}
                    placeholder="Jumlah karyawan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telat">Telat (sebutkan toko) <span className="text-red-500">*</span></Label>
                  <Input
                    id="telat"
                    value={data.report_data.absensi.telat}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      absensi: { ...data.report_data.absensi, telat: e.target.value }
                    })}
                    placeholder="Jumlah + nama toko"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alpha">Alpha/Tanpa Kabar <span className="text-red-500">*</span></Label>
                  <Input
                    id="alpha"
                    value={data.report_data.absensi.alpha}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      absensi: { ...data.report_data.absensi, alpha: e.target.value }
                    })}
                    placeholder="Jumlah karyawan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sakit_izin">Sakit/Izin <span className="text-red-500">*</span></Label>
                  <Input
                    id="sakit_izin"
                    value={data.report_data.absensi.sakit_izin}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      absensi: { ...data.report_data.absensi, sakit_izin: e.target.value }
                    })}
                    placeholder="Jumlah karyawan"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disiplin */}
          <Card>
            <CardHeader>
              <CardTitle>2. DISIPLIN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sp1">SP1 Baru <span className="text-red-500">*</span></Label>
                  <Input
                    id="sp1"
                    value={data.report_data.disiplin.sp1}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      disiplin: { ...data.report_data.disiplin, sp1: e.target.value }
                    })}
                    placeholder="Jumlah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp2">SP2 Baru <span className="text-red-500">*</span></Label>
                  <Input
                    id="sp2"
                    value={data.report_data.disiplin.sp2}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      disiplin: { ...data.report_data.disiplin, sp2: e.target.value }
                    })}
                    placeholder="Jumlah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp3">SP3 Baru <span className="text-red-500">*</span></Label>
                  <Input
                    id="sp3"
                    value={data.report_data.disiplin.sp3}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      disiplin: { ...data.report_data.disiplin, sp3: e.target.value }
                    })}
                    placeholder="Jumlah"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Sales */}
          <Card>
            <CardHeader>
              <CardTitle>3. PERFORMANCE SALES</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="top_5">Top 5 Sales Hari Ini <span className="text-red-500">*</span></Label>
                <Textarea
                  id="top_5"
                  value={data.report_data.performance_sales.top_5}
                  onChange={(e) => setData('report_data', {
                    ...data.report_data,
                    performance_sales: { ...data.report_data.performance_sales, top_5: e.target.value }
                  })}
                  placeholder="Nama karyawan + nilai penjualan"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bottom_5">Bottom 5 Sales Hari Ini <span className="text-red-500">*</span></Label>
                <Textarea
                  id="bottom_5"
                  value={data.report_data.performance_sales.bottom_5}
                  onChange={(e) => setData('report_data', {
                    ...data.report_data,
                    performance_sales: { ...data.report_data.performance_sales, bottom_5: e.target.value }
                  })}
                  placeholder="Nama karyawan + nilai penjualan"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>4. COMPLIANCE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minus_setoran">Karyawan dengan Minus Setoran <span className="text-red-500">*</span></Label>
                <Textarea
                  id="minus_setoran"
                  value={data.report_data.compliance.minus_setoran}
                  onChange={(e) => setData('report_data', {
                    ...data.report_data,
                    compliance: { ...data.report_data.compliance, minus_setoran: e.target.value }
                  })}
                  placeholder="Nama + jumlah minus"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minus_audit">Karyawan dengan Minus Audit Toko <span className="text-red-500">*</span></Label>
                <Textarea
                  id="minus_audit"
                  value={data.report_data.compliance.minus_audit}
                  onChange={(e) => setData('report_data', {
                    ...data.report_data,
                    compliance: { ...data.report_data.compliance, minus_audit: e.target.value }
                  })}
                  placeholder="Nama + temuan audit"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Training */}
          <Card>
            <CardHeader>
              <CardTitle>5. TRAINING</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instore_selesai">In-Store Training Selesai <span className="text-red-500">*</span></Label>
                  <Input
                    id="instore_selesai"
                    value={data.report_data.training.instore_selesai}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      training: { ...data.report_data.training, instore_selesai: e.target.value }
                    })}
                    placeholder="Jumlah toko"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lulus_hafalan">Sales Lulus Tes Hafalan <span className="text-red-500">*</span></Label>
                  <Input
                    id="lulus_hafalan"
                    value={data.report_data.training.lulus_hafalan}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      training: { ...data.report_data.training, lulus_hafalan: e.target.value }
                    })}
                    placeholder="Jumlah sales"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recruitment */}
          <Card>
            <CardHeader>
              <CardTitle>6. RECRUITMENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pool_pengganti">Pool Pengganti Urgent Tersedia <span className="text-red-500">*</span></Label>
                  <Input
                    id="pool_pengganti"
                    value={data.report_data.recruitment.pool_pengganti}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      recruitment: { ...data.report_data.recruitment, pool_pengganti: e.target.value }
                    })}
                    placeholder="Jumlah orang"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posisi_kosong">Posisi Kosong yang Harus Diisi <span className="text-red-500">*</span></Label>
                  <Input
                    id="posisi_kosong"
                    value={data.report_data.recruitment.posisi_kosong}
                    onChange={(e) => setData('report_data', {
                      ...data.report_data,
                      recruitment: { ...data.report_data.recruitment, posisi_kosong: e.target.value }
                    })}
                    placeholder="Nama posisi + toko"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Lampiran (Screenshot Bukti Verifikasi)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="attachments">Upload File (JPG, PNG, PDF - Max 5MB)</Label>
                <Input
                  id="attachments"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleFileChange}
                />
              </div>
              {data.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">File Terlampir:</p>
                  {data.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
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
              )}
            </CardContent>
          </Card>

          {/* Action Plan */}
          <Card>
            <CardHeader>
              <CardTitle>7. ACTION PLAN BESOK</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="action_plan"
                value={data.action_plan}
                onChange={(e) => setData('action_plan', e.target.value)}
                placeholder="Rencana aksi dan target untuk besok..."
                rows={4}
              />
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
