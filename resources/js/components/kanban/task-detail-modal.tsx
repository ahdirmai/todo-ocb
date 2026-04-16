import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';

interface TaskDetailModalProps {
    task: any | null;
    open: boolean;
    onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
    const { tags: globalTags = [] } = usePage<any>().props;

    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        task?.tags?.map((t: any) => t.id) ?? []
    );
    const [saving, setSaving] = useState(false);

    // Sync state when task changes
    if (task && task.title !== title && !saving) {
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(task.due_date?.split('T')[0] || '');
        setSelectedTagIds(task.tags?.map((t: any) => t.id) ?? []);
    }

    const toggleTag = (id: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!task) return;
        setSaving(true);
        router.put(TaskActions.update.url(task.id), {
            title,
            description,
            due_date: dueDate || undefined,
            tag_ids: selectedTagIds,
        }, {
            preserveScroll: true,
            onSuccess: () => { setSaving(false); onClose(); },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        if (!task || !confirm(`Hapus task "${task.title}"?`)) return;
        router.delete(TaskActions.destroy.url(task.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Detail Tugas
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-1">
                    {/* Tags */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {globalTags.map((tag: any) => {
                                const selected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className="px-3 py-0.5 rounded-full text-xs font-semibold text-white transition-all"
                                        style={{
                                            backgroundColor: tag.color,
                                            opacity: selected ? 1 : 0.35,
                                            transform: selected ? 'scale(1.05)' : 'scale(1)',
                                            outline: selected ? `2px solid ${tag.color}` : 'none',
                                            outlineOffset: '2px',
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-base font-semibold"
                            placeholder="Judul tugas..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Tambahkan deskripsi tugas..."
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1 block">
                            <Calendar className="w-3.5 h-3.5" /> Tenggat Waktu
                        </label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-48 text-sm"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/70">
                        <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
                            Hapus Tugas
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                                {saving
                                    ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Menyimpan...</>
                                    : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
