import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import * as KpiAdminDefinitionsActions from '@/routes/kpi/admin/definitions';

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
}

export default function KpiAdminDefinitions({ positions }: Props) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(positions[0] || null);
  const [editingDefinition, setEditingDefinition] = useState<TaskDefinition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
    position_id: selectedPosition?.id || '',
    category: '',
    task_name: '',
    description: '',
    work_method: '',
    verification_method: '',
    weight: 0,
    sequence_order: 1,
    is_active: true,
  });

  const handleCreate = () => {
    setEditingDefinition(null);
    reset();
    setData('position_id', selectedPosition?.id || '');
    setIsDialogOpen(true);
  };

  const handleEdit = (definition: TaskDefinition) => {
    setEditingDefinition(definition);
    setData({
      position_id: selectedPosition?.id || '',
      category: definition.category,
      task_name: definition.task_name,
      description: definition.description || '',
      work_method: definition.work_method || '',
      verification_method: definition.verification_method || '',
      weight: definition.weight,
      sequence_order: definition.sequence_order,
      is_active: definition.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingDefinition) {
      put(KpiAdminDefinitionsActions.update.url({ definition: editingDefinition.id }), {
        onSuccess: () => {
          setIsDialogOpen(false);
          reset();
        },
      });
    } else {
      post(KpiAdminDefinitionsActions.store.url(), {
        onSuccess: () => {
          setIsDialogOpen(false);
          reset();
        },
      });
    }
  };

  const handleDelete = (definition: TaskDefinition) => {
    if (confirm(`Hapus task definition "${definition.task_name}"?`)) {
      destroy(KpiAdminDefinitionsActions.destroy.url({ definition: definition.id }));
    }
  };

  const totalWeight = selectedPosition?.kpi_definitions.reduce((sum, def) => sum + Number(def.weight), 0) || 0;

  return (
    <AppLayout>
      <Head title="Manajemen Task Definition - KPI Admin" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manajemen Task Definition</h1>
            <p className="text-muted-foreground">Kelola template task KPI untuk setiap posisi</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDefinition ? 'Edit' : 'Tambah'} Task Definition</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori *</Label>
                    <Input
                      id="category"
                      value={data.category}
                      onChange={(e) => setData('category', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Bobot (%) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={data.weight}
                      onChange={(e) => setData('weight', parseFloat(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_name">Nama Task *</Label>
                  <Input
                    id="task_name"
                    value={data.task_name}
                    onChange={(e) => setData('task_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_method">Cara Kerja</Label>
                  <Textarea
                    id="work_method"
                    value={data.work_method}
                    onChange={(e) => setData('work_method', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verification_method">Cara Verifikasi</Label>
                  <Textarea
                    id="verification_method"
                    value={data.verification_method}
                    onChange={(e) => setData('verification_method', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sequence_order">Urutan *</Label>
                    <Input
                      id="sequence_order"
                      type="number"
                      min="1"
                      value={data.sequence_order}
                      onChange={(e) => setData('sequence_order', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status</Label>
                    <select
                      id="is_active"
                      value={data.is_active ? 'true' : 'false'}
                      onChange={(e) => setData('is_active', e.target.value === 'true')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Position Tabs */}
        <div className="flex gap-2">
          {positions.map((position) => (
            <Button
              key={position.id}
              variant={selectedPosition?.id === position.id ? 'default' : 'outline'}
              onClick={() => setSelectedPosition(position)}
            >
              {position.name}
            </Button>
          ))}
        </div>

        {/* Task List */}
        {selectedPosition && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedPosition.name} - {selectedPosition.kpi_definitions.length} Task
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total Bobot:</span>
                  <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="text-base">
                    {totalWeight.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedPosition.kpi_definitions
                  .sort((a, b) => a.sequence_order - b.sequence_order)
                  .map((definition, idx) => (
                    <div
                      key={definition.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground">#{idx + 1}</span>
                          <Badge variant="secondary">{definition.category}</Badge>
                          <span className="font-semibold">{definition.task_name}</span>
                          <Badge variant="outline">{definition.weight}%</Badge>
                          {!definition.is_active && <Badge variant="destructive">Nonaktif</Badge>}
                        </div>
                        {definition.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 ml-12">
                            {definition.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(definition)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(definition)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                {selectedPosition.kpi_definitions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Belum ada task definition untuk posisi ini</p>
                    <Button onClick={handleCreate} className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Task Pertama
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
