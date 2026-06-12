import { Head, useForm, setLayoutProps, router } from '@inertiajs/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
}

interface Position {
  id: string;
  name: string;
  kpi_definitions: TaskDefinition[];
}

interface Props {
  positions: Position[];
  categories: string[];
}

export default function KpiAdminDefinitions({ positions, categories }: Props) {
  setLayoutProps({
    breadcrumbs: [{ title: 'Task Definitions', href: '/kpi/admin/definitions' }],
  });

  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    positions[0]?.id || null,
  );
  const [editing, setEditing] = useState<TaskDefinition | null>(null);
  const [open, setOpen] = useState(false);

  const selectedPosition = positions.find((p) => p.id === selectedPositionId) || positions[0] || null;
  const tasks = (selectedPosition?.kpi_definitions || []).slice().sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
  const totalWeight = tasks.reduce((sum, t) => sum + Number(t.weight), 0);

  const { data, setData, post, put, processing, reset } = useForm({
    position_id: '',
    category: '',
    task_name: '',
    description: '',
    work_method: '',
    verification_method: '',
    weight: 0,
    sequence_order: 1,
    is_active: true,
  });

  const openCreate = () => {
    setEditing(null);
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
    });
    setOpen(true);
  };

  const openEdit = (task: TaskDefinition) => {
    setEditing(task);
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
    });
    setOpen(true);
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

  return (
    <>
      <Head title="Task Definitions" />
      <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Task Definitions
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kelola template task KPI untuk setiap posisi ·{' '}
              <span className={totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}>
                Total bobot {totalWeight.toFixed(2)}%
              </span>
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Task
          </Button>
        </div>

        {/* Position Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-sidebar-border/70 px-6 py-3">
          {positions.map((position) => (
            <button
              key={position.id}
              onClick={() => setSelectedPositionId(position.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedPositionId === position.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {position.name}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="flex flex-1 flex-col overflow-auto p-6">
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
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category" className="mb-1">
                  Kategori *
                </Label>
                <select
                  id="category"
                  value={data.category}
                  onChange={(e) => setData('category', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Pilih kategori
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
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

            <div className="grid grid-cols-2 gap-3">
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
