import { router, usePage } from '@inertiajs/react';
import { Store, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Store {
    id: number;
    branch_code: string;
    name: string;
    address: string;
    svp_id: number | null;
    svp?: {
        id: number;
        name: string;
    } | null;
}

export function SvpStoresTab({ team }: { team: any }) {
    const { auth, assignedStores = [], availableStores = [] } = usePage<{
        auth: any;
        assignedStores: Store[];
        availableStores: Store[];
    }>().props;

    const isAdmin =
        auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredAvailable = availableStores.filter(
        (store) =>
            store.branch_code.toLowerCase().includes(search.toLowerCase()) ||
            store.name.toLowerCase().includes(search.toLowerCase()) ||
            store.address.toLowerCase().includes(search.toLowerCase())
    );

    const handleAssign = (storeId: number) => {
        router.post(
            `/teams/${team.slug}/svp-stores/assign`,
            { store_id: storeId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSearch('');
                },
            }
        );
    };

    const handleUnassign = (storeId: number) => {
        if (!confirm('Lepas toko dari tim SVP ini?')) {
            return;
        }

        router.post(
            `/teams/${team.slug}/svp-stores/unassign`,
            { store_id: storeId },
            {
                preserveScroll: true,
            }
        );
    };

    return (
        <>
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Manajemen Toko SVP
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {assignedStores.length} toko ditugaskan ke tim ini
                        </p>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => setAssignModalOpen(true)}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Toko
                        </Button>
                    )}
                </div>

                {/* Assigned Stores List */}
                {assignedStores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
                        <Store className="mb-4 h-12 w-12 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                            Belum ada toko yang ditugaskan ke tim ini
                        </p>
                        {isAdmin && (
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => setAssignModalOpen(true)}
                            >
                                Tambah Toko
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {assignedStores.map((store) => (
                            <div
                                key={store.id}
                                className="group relative rounded-lg border border-sidebar-border/70 bg-white p-4 transition-colors hover:border-primary/30 dark:bg-zinc-900"
                            >
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <Badge
                                            variant="secondary"
                                            className="mb-2"
                                        >
                                            {store.branch_code}
                                        </Badge>
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                            {store.name}
                                        </h3>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() =>
                                                handleUnassign(store.id)
                                            }
                                            className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
                                            title="Lepas toko"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {store.address}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            <Dialog
                open={assignModalOpen}
                onOpenChange={(v) => !v && setAssignModalOpen(false)}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tambah Toko ke Tim SVP</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 flex flex-col gap-4">
                        <Input
                            placeholder="Cari kode cabang, nama, atau alamat..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <div className="max-h-96 overflow-y-auto">
                            {filteredAvailable.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    {search
                                        ? 'Tidak ada toko yang ditemukan'
                                        : 'Semua toko sudah ditugaskan'}
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {filteredAvailable.map((store) => (
                                        <button
                                            key={store.id}
                                            onClick={() => {
                                                handleAssign(store.id);
                                                setAssignModalOpen(false);
                                            }}
                                            className="flex items-start gap-3 rounded-lg border border-sidebar-border/70 bg-white p-3 text-left transition-colors hover:border-primary/30 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                        >
                                            <Store className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">
                                                        {store.branch_code}
                                                    </Badge>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {store.name}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                                    {store.address}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
