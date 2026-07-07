import { Head, useForm, setLayoutProps, router } from '@inertiajs/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as KpiAdminDefinitionsActions from '@/routes/kpi/admin/definitions';
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

interface TaskDefinition {
  id: string;
  category: string;
  task_name: string;
  description: string;
  work_method: string;
  verification_method: string;
  weight: number;
  sequence_order: number;
  is_active: boolean;
  can_upload_proof: boolean;
  auto_done_on_report: boolean;
  require_video_upload: boolean;
  minimum_photos: number;
}

interface Position {
  id: string;
  name: string;
  kpi_definitions: TaskDefinition[];
}

interface Props {
  positions: Position[];
}

const NEW_CATEGORY = '__new__';

export default function KpiAdminDefinitions({ positions }: Props) {
  setLayoutProps({
    breadcrumbs: [{ title: 'Task Definitions', href: '/kpi/admin/definitions' }],
  });

  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    positions[0]?.id || null,
  );
  const [editing, setEditing] = useState<TaskDefinition | null>(null);
  const [open, setOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');

  const selectedPosition = positions.find((p) => p.id === selectedPositionId) || positions[0] || null;
  const tasks = (selectedPosition?.kpi_definitions || []).slice().sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
  const totalWeight = tasks.reduce((sum, t) => sum + Number(t.weight), 0);

  const positionCategories = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of positions) {
      map[p.id] = Array.from(
        new Set(
          p.kpi_definitions
            .map((t) => t.category)
            .filter((c): c is string => Boolean(c)),
        ),
      );
    }
    return map;
  }, [positions]);

  const { data, setData, post, put, processing, reset, errors } = useForm({
    position_id: '',
    category: '',
    task_name: '',
    description: '',
    work_method: '',
    verification_method: '',
    weight: 0,
    sequence_order: 1,
    is_active: true,
    can_upload_proof: false,
    auto_done_on_report: false,
    require_video_upload: false,
    minimum_photos: 1,
  });

  const openCreate = () => {
    setEditing(null);
    setCategoryMode('existing');
    reset();
    setData({
      position_id: selectedPosition?.id || '',
      category: '',
      task_name: '',
      description: '',
      work_method: '',
      verification_method: '',
      weight: 0,
      sequence_order: tasks.length + 1,
      is_active: true,
      can_upload_proof: false,
      auto_done_on_report: false,
      require_video_upload: false,
      minimum_photos: 1,
    });
    setOpen(true);
  };

  const openEdit = (task: TaskDefinition) => {
    setEditing(task);
    const known = (positionCategories[selectedPosition?.id || ''] || []).includes(
      task.category,
    );
    setCategoryMode(known ? 'existing' : 'new');
    setData({
      position_id: selectedPosition?.id || '',
      category: task.category,
      task_name: task.task_name,
      description: task.description || '',
      work_method: task.work_method || '',
      verification_method: task.verification_method || '',
      weight: task.weight,
      sequence_order: task.sequence_order,
      is_active: task.is_active,
      can_upload_proof: task.can_upload_proof,
      auto_done_on_report: task.auto_done_on_report,
      require_video_upload: task.require_video_upload,
      minimum_photos: task.minimum_photos ?? 1,
    });
    setOpen(true);
  };

  const handlePositionChange = (newPositionId: string) => {
    setData('position_id', newPositionId);
    setCategoryMode('existing');
    setData('category', '');
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === NEW_CATEGORY) {
      setCategoryMode('new');
      setData('category', '');
    } else {
      setCategoryMode('existing');
      setData('category', value);
    }
  };

  const handleSubmit = () => {
    if (editing) {
      put(KpiAdminDefinitionsActions.update.url({ definition: editing.id }), {
        preserveScroll: true,
        onSuccess: () => setOpen(false),
      });
    } else {
      post(KpiAdminDefinitionsActions.store.url(), {
        preserveScroll: true,
        onSuccess: () => setOpen(false),
      });
    }
  };

  const handleDelete = (task: TaskDefinition) => {
    if (!confirm(`Hapus task "${task.task_name}"?`)) {
      return;
    }
    router.delete(KpiAdminDefinitionsActions.destroy.url({ definition: task.id }), {
      preserveScroll: true,
    });
  };

  const currentCategories = positionCategories[data.position_id] || [];

  return (
    <>
      <Head title="Task Definitions" />
      <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-sidebar-border/70 px-4 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
              Task Definitions
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kelola template task KPI untuk setiap posisi ·{' '}
              <span className={totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}>
                Total bobot {totalWeight.toFixed(2)}%
              </span>
            </p>
          </div>
          <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" /> Tambah Task
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
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="flex flex-1 flex-col overflow-auto p-4 sm:p-6">
          {tasks.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Belum ada task definition untuk posisi ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="group flex flex-col gap-2 rounded-xl border border-sidebar-border/70 bg-white p-4 transition-colors hover:border-primary/30 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {task.category}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {task.task_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Number(task.weight).toFixed(2)}%
                      </Badge>
                      {!task.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(task)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {task.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Task Definition' : 'Tambah Task Definition'}
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
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <Label htmlFor="weight" className="mb-1">
                  Bobot (%) *
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={data.weight}
                  onChange={(e) =>
                    setData('weight', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="mb-1">
                Kategori *
              </Label>
              {categoryMode === 'existing' ? (
                <select
                  id="category"
                  value={data.category}
                  onChange={(e) => handleCategorySelectChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!data.position_id}
                >
                  <option value="" disabled>
                    {data.position_id
                      ? currentCategories.length > 0
                        ? 'Pilih kategori'
                        : 'Belum ada kategori untuk posisi ini'
                      : 'Pilih posisi dulu'}
                  </option>
                  {currentCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ Kategori baru...</option>
                </select>
              ) : (
                <Input
                  id="category"
                  value={data.category}
                  onChange={(e) => setData('category', e.target.value)}
                  placeholder="Tulis kategori baru"
                  autoFocus
                />
              )}
            </div>

            <div>
              <Label htmlFor="task_name" className="mb-1">
                Nama Task *
              </Label>
              <Input
                id="task_name"
                value={data.task_name}
                onChange={(e) => setData('task_name', e.target.value)}
                placeholder="Contoh: Buka toko tepat jam"
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-1">
                Deskripsi
              </Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                rows={2}
                placeholder="Penjelasan singkat task"
              />
            </div>

            <div>
              <Label htmlFor="work_method" className="mb-1">
                Cara Kerja
              </Label>
              <Textarea
                id="work_method"
                value={data.work_method}
                onChange={(e) => setData('work_method', e.target.value)}
                rows={2}
                placeholder="Langkah-langkah mengerjakan task"
              />
            </div>

            <div>
              <Label htmlFor="verification_method" className="mb-1">
                Cara Verifikasi
              </Label>
              <Textarea
                id="verification_method"
                value={data.verification_method}
                onChange={(e) => setData('verification_method', e.target.value)}
                rows={2}
                placeholder="Bagaimana task ini diverifikasi"
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-4 py-3">
              <input
                id="can_upload_proof"
                type="checkbox"
                checked={data.can_upload_proof}
                onChange={(e) => setData('can_upload_proof', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="can_upload_proof" className="mb-0 cursor-pointer text-sm font-normal">
                <span className="font-medium">Can Upload Proof</span>
                <p className="text-xs text-muted-foreground">
                  Izinkan upload bukti (foto/dokumen) untuk task ini
                </p>
              </Label>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-4 py-3">
              <input
                id="auto_done_on_report"
                type="checkbox"
                checked={data.auto_done_on_report}
                onChange={(e) => setData('auto_done_on_report', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="auto_done_on_report" className="mb-0 cursor-pointer text-sm font-normal">
                <span className="font-medium">Auto-Done saat Kirim Laporan</span>
                <p className="text-xs text-muted-foreground">
                  Task otomatis selesai ketika laporan harian dikirim (total maks 10% bobot per posisi)
                </p>
              </Label>
            </div>
            {errors.auto_done_on_report && (
              <p className="text-xs text-red-600">{errors.auto_done_on_report}</p>
            )}

            <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-4 py-3">
              <input
                id="require_video_upload"
                type="checkbox"
                checked={data.require_video_upload}
                onChange={(e) => setData('require_video_upload', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="require_video_upload" className="mb-0 cursor-pointer text-sm font-normal">
                <span className="font-medium">Wajib Upload Video</span>
                <p className="text-xs text-muted-foreground">
                  Task hanya bisa diverifikasi setelah ada video bukti (rekam kamera atau upload galeri)
                </p>
              </Label>
            </div>

            <div>
              <Label htmlFor="minimum_photos" className="mb-1">
                Minimum Foto
              </Label>
              <Input
                id="minimum_photos"
                type="number"
                min={0}
                max={20}
                value={data.minimum_photos}
                onChange={(e) => setData('minimum_photos', Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Jumlah foto minimal dalam satu komentar bukti sebelum task bisa diverifikasi (0 = tidak wajib).
              </p>
              {errors.minimum_photos && (
                <p className="mt-1 text-xs text-red-600">{errors.minimum_photos}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="sequence_order" className="mb-1">
                  Urutan *
                </Label>
                <Input
                  id="sequence_order"
                  type="number"
                  min={1}
                  value={data.sequence_order}
                  onChange={(e) =>
                    setData('sequence_order', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div>
                <Label htmlFor="is_active" className="mb-1">
                  Status
                </Label>
                <select
                  id="is_active"
                  value={data.is_active ? 'true' : 'false'}
                  onChange={(e) => setData('is_active', e.target.value === 'true')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
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
