import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Clock, Send, Paperclip, X, Calendar, AlertCircle } from 'lucide-react';
import KpiLayout from '@/layouts/kpi-layout';

export interface ReportField {
  field_key: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  field_options: {
    placeholder?: string;
    rows?: number;
    max_length?: number;
    options?: string[];
  } | null;
  group_label: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface ReportTemplate {
  report_date: string;
  total_tasks: number;
  completed_tasks: number;
  verified_tasks: number;
  completion_percentage: number;
  total_score: number;
  grade: string;
}

export interface ExistingReportData {
  id: string;
  fields: Record<string, unknown>;
  submitted_at: string;
  is_late: boolean;
}

interface Props {
  area: 'hr' | 'operational' | 'gudang' | 'spv';
  areaLabel: string;
  template: ReportTemplate;
  reportFields: ReportField[];
  existingReport: ExistingReportData | null;
  canSubmit: boolean;
  isEditing?: boolean;
  reportId?: string;
  selectedDate?: string;
  isToday?: boolean;
}

/**
 * Get a value from a nested object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }
  return (current as string) ?? '';
}

/**
 * Set a value in a nested object using dot notation. Returns a new object.
 */
function setNestedValue(obj: Record<string, unknown>, key: string, value: string): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const parts = key.split('.');

  if (parts.length === 1) {
    clone[key] = value;
    return clone;
  }

  let current = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return clone;
}

/**
 * Build initial form values from report fields and existing report data.
 */
function buildInitialFields(reportFields: ReportField[], existingReport: ExistingReportData | null): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const rf of reportFields) {
    const key = rf.field_key;
    const parts = key.split('.');
    const fallback = rf.field_type === 'date' ? today : '';

    if (parts.length === 1) {
      const existing = existingReport ? getNestedValue(existingReport.fields ?? {}, key) : '';
      fields[key] = existing || fallback;
    } else {
      // Nested key — ensure parent exists
      const parent = parts[0];
      if (!fields[parent] || typeof fields[parent] !== 'object') {
        // Try to get entire parent object from existing
        if (existingReport?.fields?.[parent] && typeof existingReport.fields[parent] === 'object') {
          fields[parent] = JSON.parse(JSON.stringify(existingReport.fields[parent]));
        } else {
          fields[parent] = {};
        }
      }
      const parentObj = fields[parent] as Record<string, unknown>;
      const childKey = parts.slice(1).join('.');
      if (parentObj[childKey] === undefined || parentObj[childKey] === '') {
        parentObj[childKey] = fallback;
      }
    }
  }

  return fields;
}

export default function DynamicReportForm({
  area,
  areaLabel,
  template,
  reportFields,
  existingReport,
  canSubmit,
  isEditing = false,
  reportId,
  selectedDate,
  isToday = true,
}: Props) {
  const initialFields = buildInitialFields(reportFields, existingReport);

  const { data, setData, post, put, processing, errors } = useForm({
    fields: initialFields as Record<string, string | Record<string, string>>,
    report_date: selectedDate || template.report_date,
    attachments: [] as File[],
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.get(`/${area}/kpi/report/create`, { date: newDate }, { preserveState: false });
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    setData('fields', setNestedValue(data.fields, fieldKey, value) as Record<string, string | Record<string, string>>);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setData('attachments', [...data.attachments, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setData('attachments', data.attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (isEditing && reportId) {
      put(`/${area}/kpi/report/${reportId}`);
    } else {
      post(`/${area}/kpi/report/submit`);
    }
  };

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });
  const isNearDeadline = parseInt(currentTime.split(':')[0]) >= 21;
  const today = new Date().toISOString().slice(0, 10);

  // Group fields by group_label
  const grouped: { label: string; fields: ReportField[] }[] = [];
  let lastGroup: string | null = null;
  for (const field of reportFields) {
    const groupLabel = field.group_label || 'Isi Laporan';
    if (groupLabel !== lastGroup) {
      grouped.push({ label: groupLabel, fields: [field] });
      lastGroup = groupLabel;
    } else {
      grouped[grouped.length - 1].fields.push(field);
    }
  }

  const renderField = (field: ReportField) => {
    const value = getNestedValue(data.fields, field.field_key);
    const error = (errors as Record<string, string>)[`fields.${field.field_key}`];
    const maxLength = field.field_options?.max_length;

    return (
      <div key={field.field_key} className="space-y-2">
        <Label htmlFor={field.field_key}>
          {field.field_label}
          {field.is_required && <span className="text-red-500"> *</span>}
        </Label>
        {field.field_type === 'textarea' ? (
          <>
            <Textarea
              id={field.field_key}
              value={value}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              placeholder={field.field_options?.placeholder}
              rows={field.field_options?.rows ?? 3}
              maxLength={maxLength}
              disabled={!canSubmit}
              className={error ? 'border-red-500' : ''}
            />
            {maxLength && (
              <p className="text-xs text-muted-foreground">{value.length}/{maxLength} karakter</p>
            )}
          </>
        ) : field.field_type === 'number' ? (
          <Input
            id={field.field_key}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={field.field_options?.placeholder}
            disabled={!canSubmit}
            className={error ? 'border-red-500' : ''}
          />
        ) : field.field_type === 'date' ? (
          <Input
            id={field.field_key}
            type="date"
            value={value || today}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            disabled={!canSubmit}
            className={error ? 'border-red-500' : ''}
          />
        ) : field.field_type === 'select' ? (
          <select
            id={field.field_key}
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            disabled={!canSubmit}
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${error ? 'border-red-500' : 'border-input'}`}
          >
            <option value="">Pilih...</option>
            {(field.field_options?.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <Input
            id={field.field_key}
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={field.field_options?.placeholder}
            disabled={!canSubmit}
            className={error ? 'border-red-500' : ''}
          />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  return (
    <KpiLayout area={area}>
      <Head title={isEditing ? `Edit Laporan CEO - ${areaLabel}` : `Laporan Harian CEO - ${areaLabel}`} />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? `Edit Laporan CEO` : `Laporan Harian CEO`}
            </h1>
            <p className="text-muted-foreground">
              Deadline: 23:30 WITA — Waktu Saat Ini: {currentTime} WITA
            </p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="date-picker" className="whitespace-nowrap text-sm text-muted-foreground">
                Pilih Tanggal:
              </Label>
              <Input
                id="date-picker"
                type="date"
                value={data.report_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={handleDateChange}
                className="w-auto"
              />
            </div>
          )}
        </div>

        {/* Warning if near deadline */}
        {isNearDeadline && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Mendekati deadline! Kirim laporan sebelum 23:30 WITA untuk menghindari status terlambat.
            </AlertDescription>
          </Alert>
        )}

        {/* Read-only / cannot-submit warnings */}
        {!canSubmit && !isEditing && existingReport && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isToday ? (
                <>
                  Laporan untuk hari ini sudah pernah dikirim.{' '}
                  <Link href={`/${area}/kpi/reports`} className="underline font-medium">
                    Lihat Riwayat Laporan
                  </Link>
                </>
              ) : (
                `Laporan tanggal ${data.report_date} hanya bisa dilihat (read-only). Laporan hari sebelumnya tidak dapat diubah.`
              )}
            </AlertDescription>
          </Alert>
        )}
        {!canSubmit && !isEditing && !existingReport && !isToday && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tidak ada laporan untuk tanggal {data.report_date}. Laporan hari sebelumnya tidak dapat diisi — hanya laporan hari ini yang bisa dikirim.
            </AlertDescription>
          </Alert>
        )}

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Kinerja Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

        {/* Report Form — Dynamic Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.label}>
              <CardHeader>
                <CardTitle>{group.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.fields.length <= 2 ? (
                  group.fields.map(renderField)
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {group.fields.map(renderField)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

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
                <Label htmlFor="attachments" className="mb-2 block text-sm font-medium">
                  Upload file (JPG, PNG, PDF — max 5 MB per file, max 5 file)
                </Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  disabled={data.attachments.length >= 5 || !canSubmit}
                  className="cursor-pointer"
                />
              </div>

              {data.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">File yang diupload:</p>
                  <div className="space-y-2">
                    {data.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between rounded bg-secondary p-2 text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(errors as Record<string, string>).attachments && (
                <p className="text-sm text-red-500">{(errors as Record<string, string>).attachments}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href={`/${area}/kpi/reports`}>
                {canSubmit || isEditing ? 'Batal' : 'Kembali'}
              </Link>
            </Button>
            {(canSubmit || isEditing) && (
              <Button type="submit" disabled={processing || (!canSubmit && !isEditing)}>
                <Send className="mr-2 h-4 w-4" />
                {processing ? 'Menyimpan...' : isEditing ? 'Update Laporan' : 'Kirim Laporan'}
              </Button>
            )}
          </div>
        </form>

        {/* Existing Report Info */}
        {existingReport && !isEditing && (
          <Alert>
            <AlertDescription>
              Laporan sudah pernah dikirim pada {existingReport.submitted_at}.
              {existingReport.is_late && ' (TERLAMBAT)'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </KpiLayout>
  );
}
