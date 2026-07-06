import { Head, useForm, setLayoutProps, router } from '@inertiajs/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import * as ReportFieldActions from '@/routes/kpi/admin/report-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface FieldOptions {
  placeholder?: string;
  rows?: number;
  max_length?: number;
  options?: string[];
}

interface ReportField {
  id: number;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  field_options: FieldOptions | null;
  group_label: string | null;
  is_required: boolean;
  sort_order: number;
}

interface Position {
  id: string;
  name: string;
  report_fields: ReportField[];
}

interface Props {
  positions: Position[];
}

const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select'] as const;

const TYPE_LABEL: Record<string, string> = {
  text: 'Teks',
  textarea: 'Teks Panjang',
  number: 'Angka',
  date: 'Tanggal',
  select: 'Dropdown',
};

export default function KpiAdminReportFields({ positions }: Props) {
  setLayoutProps({
    breadcrumbs: [{ title: 'Report Fields', href: '/kpi/admin/report-fields' }],
  });

  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    positions[0]?.id || null,
  );
  const [editing, setEditing] = useState<ReportField | null>(null);
  const [open, setOpen] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  const selectedPosition =
    positions.find((p) => p.id === selectedPositionId) || positions[0] || null;

  const fields = (selectedPosition?.report_fields || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  // Group fields by group_label, preserving sorted order.
  const grouped: { label: string; fields: ReportField[] }[] = [];
  let lastGroup: string | null = null;
  for (const f of fields) {
    const label = f.group_label || 'Tanpa Grup';
    if (label !== lastGroup) {
      grouped.push({ label, fields: [f] });
      lastGroup = label;
    } else {
      grouped[grouped.length - 1].fields.push(f);
    }
  }

  const { data, setData, post, put, processing, reset, transform } = useForm({
    position_id: '',
    field_key: '',
    field_label: '',
    field_type: 'text' as ReportField['field_type'],
    group_label: '',
    is_required: false,
    sort_order: 1,
    field_options: {
      placeholder: '',
      rows: 3,
      max_length: undefined as number | undefined,
      options: [] as string[],
    } as FieldOptions,
  });

  const openCreate = () => {
    setEditing(null);
    reset();
    setOptionsText('');
    setData({
      position_id: selectedPosition?.id || '',
      field_key: '',
      field_label: '',
      field_type: 'text',
      group_label: '',
      is_required: false,
      sort_order: fields.length + 1,
      field_options: { placeholder: '', rows: 3, max_length: undefined, options: [] },
    });
    setOpen(true);
  };

  const openEdit = (field: ReportField) => {
    setEditing(field);
    const opts = field.field_options || {};
    setOptionsText((opts.options ?? []).join('\n'));
    setData({
      position_id: selectedPosition?.id || '',
      field_key: field.field_key,
      field_label: field.field_label,
      field_type: field.field_type,
      group_label: field.group_label || '',
      is_required: field.is_required,
      sort_order: field.sort_order,
      field_options: {
        placeholder: opts.placeholder || '',
        rows: opts.rows ?? 3,
        max_length: opts.max_length,
        options: opts.options ?? [],
      },
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    transform((current) => {
      const t = current.field_type;
      const options: FieldOptions = {};

      if (t !== 'date' && current.field_options.placeholder) {
        options.placeholder = current.field_options.placeholder;
      }
      if (t === 'textarea' && current.field_options.rows) {
        options.rows = current.field_options.rows;
      }
      if ((t === 'text' || t === 'textarea') && current.field_options.max_length) {
        options.max_length = current.field_options.max_length;
      }
      if (t === 'select') {
        options.options = optionsText
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean);
      }

      return { ...current, field_options: options };
    });

    if (editing) {
      put(ReportFieldActions.update.url({ reportField: editing.id }), {
        preserveScroll: true,
        onSuccess: () => setOpen(false),
      });
    } else {
      post(ReportFieldActions.store.url(), {
        preserveScroll: true,
        onSuccess: () => setOpen(false),
      });
    }
  };

  const handleDelete = (field: ReportField) => {
    if (!confirm(`Hapus field "${field.field_label}"?`)) {
      return;
    }
    router.delete(ReportFieldActions.destroy.url({ reportField: field.id }), {
      preserveScroll: true,
    });
  };

  const type = data.field_type;

  return (
    <>
      <Head title="Report Fields" />
      <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-sidebar-border/70 px-4 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
              Report Fields
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kelola field laporan harian untuk setiap posisi. Field ini muncul di
              form submit laporan.
            </p>
          </div>
          <Button
            onClick={openCreate}
            disabled={!selectedPosition}
            className="w-full gap-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Tambah Field
          </Button>
        </div>

        {/* Position Tabs */}
        <div className="border-b border-sidebar-border/70">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:px-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            {positions.map((position) => (
              <button
                key={position.id}
                onClick={() => setSelectedPositionId(position.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedPositionId === position.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {position.name}
                <span className="ml-1.5 text-xs opacity-70">
                  ({position.report_fields.length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Field List */}
        <div className="flex flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6">
          {fields.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Belum ada report field untuk posisi ini.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {group.label}
                </h2>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {group.fields.map((field) => (
                    <div
                      key={field.id}
                      className="group flex flex-col gap-2 rounded-xl border border-sidebar-border/70 bg-white p-4 transition-colors hover:border-primary/30 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            #{field.sort_order}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {field.field_label}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {TYPE_LABEL[field.field_type] ?? field.field_type}
                          </Badge>
                          {field.is_required && (
                            <Badge variant="outline" className="text-xs">
                              Wajib
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(field)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(field)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <code className="text-xs text-muted-foreground">
                        {field.field_key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Report Field' : 'Tambah Report Field'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="position_id" className="mb-1">
                  Posisi *
                </Label>
                <select
                  id="position_id"
                  value={data.position_id}
                  onChange={(e) => setData('position_id', e.target.value)}
                  disabled={!!editing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="" disabled>
                    Pilih posisi
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="field_type" className="mb-1">
                  Tipe Field *
                </Label>
                <select
                  id="field_type"
                  value={data.field_type}
                  onChange={(e) =>
                    setData('field_type', e.target.value as ReportField['field_type'])
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="field_label" className="mb-1">
                Label *
              </Label>
              <Input
                id="field_label"
                value={data.field_label}
                onChange={(e) => setData('field_label', e.target.value)}
                placeholder="Contoh: Hasil Audit Toko"
              />
            </div>

            <div>
              <Label htmlFor="field_key" className="mb-1">
                Field Key *
              </Label>
              <Input
                id="field_key"
                value={data.field_key}
                onChange={(e) => setData('field_key', e.target.value)}
                disabled={!!editing}
                className="font-mono disabled:opacity-60"
                placeholder="audit.minus"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Huruf kecil, angka, titik, underscore. Titik = nested (mis.{' '}
                <code>absensi.hadir</code>). Tidak bisa diubah setelah dibuat.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="group_label" className="mb-1">
                  Grup
                </Label>
                <Input
                  id="group_label"
                  value={data.group_label}
                  onChange={(e) => setData('group_label', e.target.value)}
                  placeholder="1. Hasil Audit Toko"
                />
              </div>
              <div>
                <Label htmlFor="sort_order" className="mb-1">
                  Urutan *
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={data.sort_order}
                  onChange={(e) =>
                    setData('sort_order', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {/* Field options — conditional */}
            {type !== 'date' && (
              <div>
                <Label htmlFor="placeholder" className="mb-1">
                  Placeholder
                </Label>
                <Input
                  id="placeholder"
                  value={data.field_options.placeholder || ''}
                  onChange={(e) =>
                    setData('field_options', {
                      ...data.field_options,
                      placeholder: e.target.value,
                    })
                  }
                  placeholder="Teks bantuan di dalam input"
                />
              </div>
            )}

            {type === 'textarea' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rows" className="mb-1">
                    Tinggi (baris)
                  </Label>
                  <Input
                    id="rows"
                    type="number"
                    min={1}
                    max={20}
                    value={data.field_options.rows ?? 3}
                    onChange={(e) =>
                      setData('field_options', {
                        ...data.field_options,
                        rows: parseInt(e.target.value) || 3,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_length" className="mb-1">
                    Maks Karakter
                  </Label>
                  <Input
                    id="max_length"
                    type="number"
                    min={1}
                    value={data.field_options.max_length ?? ''}
                    onChange={(e) =>
                      setData('field_options', {
                        ...data.field_options,
                        max_length: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Kosongkan jika tak dibatasi"
                  />
                </div>
              </div>
            )}

            {type === 'text' && (
              <div>
                <Label htmlFor="max_length_text" className="mb-1">
                  Maks Karakter
                </Label>
                <Input
                  id="max_length_text"
                  type="number"
                  min={1}
                  value={data.field_options.max_length ?? ''}
                  onChange={(e) =>
                    setData('field_options', {
                      ...data.field_options,
                      max_length: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Kosongkan jika tak dibatasi"
                />
              </div>
            )}

            {type === 'select' && (
              <div>
                <Label htmlFor="options" className="mb-1">
                  Opsi Dropdown (satu per baris) *
                </Label>
                <Textarea
                  id="options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={4}
                  placeholder={'Opsi A\nOpsi B\nOpsi C'}
                />
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-4 py-3">
              <input
                id="is_required"
                type="checkbox"
                checked={data.is_required}
                onChange={(e) => setData('is_required', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="is_required"
                className="mb-0 cursor-pointer text-sm font-normal"
              >
                <span className="font-medium">Wajib Diisi</span>
                <p className="text-xs text-muted-foreground">
                  Field ini harus diisi saat submit laporan.
                </p>
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={processing}>
                {processing ? 'Menyimpan...' : editing ? 'Simpan' : 'Buat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
