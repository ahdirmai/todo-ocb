import { useState } from 'react';
import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as TagActions from '@/actions/App/Http/Controllers/TagController';

interface Tag {
    id: string;
    name: string;
    color: string;
}

const PRESET_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444',
    '#10b981', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

type PaginatedTags = {
    data: Tag[];
    total: number;
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

export default function TagsIndex() {
    const { tags } = usePage<{ tags: PaginatedTags }>().props;

    setLayoutProps({
        breadcrumbs: [{ title: 'Manajemen Tag Global', href: '/tags' }]
    });

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Tag | null>(null);
    const [form, setForm] = useState({ name: '', color: PRESET_COLORS[0] });

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', color: PRESET_COLORS[0] });
        setOpen(true);
    };

    const openEdit = (tag: Tag) => {
        setEditing(tag);
        setForm({ name: tag.name, color: tag.color });
        setOpen(true);
    };

    const handleSubmit = () => {
        if (editing) {
            router.put(TagActions.update.url(editing.id), form, { onSuccess: () => setOpen(false) });
        } else {
            router.post(TagActions.store.url(), form, { onSuccess: () => setOpen(false) });
        }
    };

    const handleDelete = (tag: Tag) => {
        if (!confirm(`Hapus tag "${tag.name}"?`)) return;
        router.delete(TagActions.destroy.url(tag.id));
    };

    return (
        <>
            <Head title="Manajemen Tag" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sidebar-border/70">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Manajemen Tag</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Total {tags.total} tag tersedia</p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="w-4 h-4" /> Buat Tag
                    </Button>
                </div>

                {/* Tag Grid */}
                <div className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1 content-start">
                        {tags.data.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center col-span-full py-12 border-2 border-dashed border-border rounded-xl">
                                Belum ada tag yang dibuat.
                            </p>
                        ) : (
                            tags.data.map((tag: Tag) => (
                                <div
                                    key={tag.id}
                                    className="flex items-center justify-between p-3 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900 group hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tag.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(tag)}
                                            className="p-1 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag)}
                                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {tags.last_page > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-sidebar-border/70">
                            <p className="text-xs text-muted-foreground">
                                Halaman {tags.current_page} dari {tags.last_page} · Menampilkan {tags.data.length} data
                            </p>
                            <div className="flex gap-2">
                                {tags.prev_page_url && (
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.visit(tags.prev_page_url!)}>
                                        ← Sebelumnya
                                    </Button>
                                )}
                                {tags.next_page_url && (
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.visit(tags.next_page_url!)}>
                                        Berikutnya →
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Tag' : 'Buat Tag Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Tag</label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Contoh: Design, Bug, Feature..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Warna</label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setForm({ ...form, color: c })}
                                        className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Preview */}
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Preview:</span>
                                <span
                                    className="px-3 py-0.5 rounded-full text-xs font-semibold text-white"
                                    style={{ backgroundColor: form.color }}
                                >
                                    {form.name || 'Tag Name'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                            <Button onClick={handleSubmit}>{editing ? 'Simpan' : 'Buat'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
