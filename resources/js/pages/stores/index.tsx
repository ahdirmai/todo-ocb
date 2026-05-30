import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Store } from 'lucide-react';
import { useState } from 'react';
import * as StoreActions from '@/actions/App/Http/Controllers/StoreController';
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

interface Store {
    id: number;
    branch_code: string;
    name: string;
    address: string;
}

type PaginatedStores = {
    data: Store[];
    total: number;
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

export default function StoresIndex() {
    const { stores, filters } = usePage<{
        stores: PaginatedStores;
        filters: { search?: string };
    }>().props;

    setLayoutProps({
        breadcrumbs: [{ title: 'Manajemen Toko', href: '/stores' }],
    });

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Store | null>(null);
    const [form, setForm] = useState({
        branch_code: '',
        name: '',
        address: '',
    });
    const [search, setSearch] = useState(filters?.search || '');

    const openCreate = () => {
        setEditing(null);
        setForm({ branch_code: '', name: '', address: '' });
        setOpen(true);
    };

    const openEdit = (store: Store) => {
        setEditing(store);
        setForm({
            branch_code: store.branch_code,
            name: store.name,
            address: store.address,
        });
        setOpen(true);
    };

    const handleSubmit = () => {
        if (editing) {
            router.put(StoreActions.update.url(editing.id), form, {
                onSuccess: () => setOpen(false),
            });
        } else {
            router.post(StoreActions.store.url(), form, {
                onSuccess: () => setOpen(false),
            });
        }
    };

    const handleDelete = (store: Store) => {
        if (!confirm(`Hapus toko "${store.branch_code} - ${store.name}"?`)) {
            return;
        }

        router.delete(StoreActions.destroy.url(store.id));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            StoreActions.index.url(),
            { search },
            { preserveState: true }
        );
    };

    return (
        <>
            <Head title="Manajemen Toko" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Manajemen Toko
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Total {stores.total} toko tersedia
                            </p>
                        </div>
                        <Button onClick={openCreate} className="gap-2">
                            <Plus className="h-4 w-4" /> Tambah Toko
                        </Button>
                    </div>

                    {/* Search */}
                    <form
                        onSubmit={handleSearch}
                        className="mt-4 flex gap-2"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Cari kode cabang, nama, atau alamat..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Cari
                        </Button>
                        {search && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch('');
                                    router.get(StoreActions.index.url());
                                }}
                            >
                                Reset
                            </Button>
                        )}
                    </form>
                </div>

                {/* Stores Table */}
                <div className="flex-1 overflow-auto p-6">
                    {stores.data.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="rounded-xl border-2 border-dashed border-border py-12 px-8 text-center">
                                <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">
                                    {search
                                        ? 'Tidak ada toko yang ditemukan.'
                                        : 'Belum ada toko yang terdaftar.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-sidebar-border/70">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                            Kode Cabang
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                            Nama Toko
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                            Alamat
                                        </th>
                                        <th className="w-24 px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/70">
                                    {stores.data.map((store: Store) => (
                                        <tr
                                            key={store.id}
                                            className="transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {store.branch_code}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {store.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                {store.address}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            openEdit(store)
                                                        }
                                                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(store)
                                                        }
                                                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {stores.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-sidebar-border/70 pt-6">
                            <p className="text-xs text-muted-foreground">
                                Halaman {stores.current_page} dari{' '}
                                {stores.last_page} · Menampilkan{' '}
                                {stores.data.length} data
                            </p>
                            <div className="flex gap-2">
                                {stores.prev_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(stores.prev_page_url!)
                                        }
                                    >
                                        ← Sebelumnya
                                    </Button>
                                )}
                                {stores.next_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(stores.next_page_url!)
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Edit Toko' : 'Tambah Toko Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-4">
                        <div>
                            <Label htmlFor="branch_code">Kode Cabang</Label>
                            <Input
                                id="branch_code"
                                value={form.branch_code}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        branch_code: e.target.value,
                                    })
                                }
                                placeholder="Contoh: OC1, OC2..."
                            />
                        </div>

                        <div>
                            <Label htmlFor="name">Nama Toko</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="Contoh: OSCAR CELL"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address">Alamat</Label>
                            <Textarea
                                id="address"
                                value={form.address}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        address: e.target.value,
                                    })
                                }
                                placeholder="Masukkan alamat lengkap toko"
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button onClick={handleSubmit}>
                                {editing ? 'Simpan' : 'Tambah'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
