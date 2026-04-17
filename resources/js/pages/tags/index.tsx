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
    '#3b82f6',
    '#8b5cf6',
    '#f59e0b',
    '#ec4899',
    '#ef4444',
    '#10b981',
    '#06b6d4',
    '#f97316',
    '#84cc16',
    '#6366f1',
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
        breadcrumbs: [{ title: 'Manajemen Tag Global', href: '/tags' }],
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
            router.put(TagActions.update.url(editing.id), form, {
                onSuccess: () => setOpen(false),
            });
        } else {
            router.post(TagActions.store.url(), form, {
                onSuccess: () => setOpen(false),
            });
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
                <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div>
                        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Manajemen Tag
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Total {tags.total} tag tersedia
                        </p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Buat Tag
                    </Button>
                </div>

                {/* Tag Grid */}
                <div className="flex flex-1 flex-col overflow-auto p-6">
                    <div className="grid flex-1 grid-cols-2 content-start gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {tags.data.length === 0 ? (
                            <p className="col-span-full rounded-xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                                Belum ada tag yang dibuat.
                            </p>
                        ) : (
                            tags.data.map((tag: Tag) => (
                                <div
                                    key={tag.id}
                                    className="group flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-white p-3 transition-colors hover:border-primary/30 dark:bg-zinc-900"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="h-4 w-4 flex-shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: tag.color,
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {tag.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={() => openEdit(tag)}
                                            className="rounded p-1 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag)}
                                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {tags.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-sidebar-border/70 pt-6">
                            <p className="text-xs text-muted-foreground">
                                Halaman {tags.current_page} dari{' '}
                                {tags.last_page} · Menampilkan{' '}
                                {tags.data.length} data
                            </p>
                            <div className="flex gap-2">
                                {tags.prev_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(tags.prev_page_url!)
                                        }
                                    >
                                        ← Sebelumnya
                                    </Button>
                                )}
                                {tags.next_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(tags.next_page_url!)
                                        }
                                    >
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
                        <DialogTitle>
                            {editing ? 'Edit Tag' : 'Buat Tag Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Nama Tag
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="Contoh: Design, Bug, Feature..."
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleSubmit()
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Warna
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() =>
                                            setForm({ ...form, color: c })
                                        }
                                        className={`h-7 w-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-slate-400 ring-offset-1' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Preview */}
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    Preview:
                                </span>
                                <span
                                    className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                                    style={{ backgroundColor: form.color }}
                                >
                                    {form.name || 'Tag Name'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button onClick={handleSubmit}>
                                {editing ? 'Simpan' : 'Buat'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
