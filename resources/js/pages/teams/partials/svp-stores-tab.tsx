import { router, usePage } from '@inertiajs/react';
import { Store, UserCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StoreData {
    id: number;
    branch_code: string;
    name: string;
    address: string;
    spv_id: number | null;
    spv?: {
        id: number;
        name: string;
    } | null;
}

interface SpvMember {
    id: number;
    name: string;
    email: string;
    stores_count: number;
}

export function SvpStoresTab({ team }: { team: any }) {
    const { auth, stores = [], spvMembers = [] } = usePage<{
        auth: any;
        stores: StoreData[];
        spvMembers: SpvMember[];
    }>().props;

    const isAdmin =
        auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    const [search, setSearch] = useState('');

    const filteredStores = stores.filter(
        (store) =>
            store.branch_code.toLowerCase().includes(search.toLowerCase()) ||
            store.name.toLowerCase().includes(search.toLowerCase()) ||
            store.address.toLowerCase().includes(search.toLowerCase()) ||
            store.spv?.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAssign = (storeId: number, spvId: string) => {
        if (!spvId) {
            return;
        }

        router.post(
            `/teams/${team.slug}/svp-stores/assign`,
            {
                store_id: storeId,
                spv_id: parseInt(spvId),
            },
            {
                preserveScroll: true,
            }
        );
    };

    const handleUnassign = (storeId: number) => {
        if (!confirm('Lepas toko dari SPV?')) {
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

    // Calculate statistics
    const totalStores = stores.length;
    const assignedStores = stores.filter((s) => s.spv_id).length;
    const unassignedStores = totalStores - assignedStores;

    return (
        <div className="flex flex-col gap-6">
            {/* Header & Stats */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Manajemen Toko SPV
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Atur penugasan SPV untuk setiap toko
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="rounded-lg border border-sidebar-border/70 bg-white px-4 py-2 dark:bg-zinc-900">
                            <div className="text-xs text-muted-foreground">
                                Total Toko
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {totalStores}
                            </div>
                        </div>
                        <div className="rounded-lg border border-sidebar-border/70 bg-white px-4 py-2 dark:bg-zinc-900">
                            <div className="text-xs text-muted-foreground">
                                Terisi
                            </div>
                            <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                {assignedStores}
                            </div>
                        </div>
                        <div className="rounded-lg border border-sidebar-border/70 bg-white px-4 py-2 dark:bg-zinc-900">
                            <div className="text-xs text-muted-foreground">
                                Kosong
                            </div>
                            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                {unassignedStores}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SPV Members Summary */}
                {spvMembers.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {spvMembers.map((spv) => (
                            <div
                                key={spv.id}
                                className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-white p-3 dark:bg-zinc-900"
                            >
                                <UserCheck className="h-5 w-5 text-primary" />
                                <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                                        {spv.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {spv.stores_count} toko
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Cari kode cabang, nama toko, alamat, atau SPV..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Stores Table */}
            {filteredStores.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
                    <Store className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                        {search
                            ? 'Tidak ada toko yang ditemukan'
                            : 'Belum ada data toko'}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-sidebar-border/70">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                        Kode
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                        Nama Toko
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                        Alamat
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                        SPV
                                    </th>
                                    {isAdmin && (
                                        <th className="w-48 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                                            Aksi
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/70">
                                {filteredStores.map((store) => (
                                    <tr
                                        key={store.id}
                                        className="transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary">
                                                {store.branch_code}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {store.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                            {store.address}
                                        </td>
                                        <td className="px-4 py-3">
                                            {store.spv ? (
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                        {store.spv.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    Belum ditugaskan
                                                </span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={
                                                            store.spv_id?.toString() ||
                                                            ''
                                                        }
                                                        onValueChange={(v) =>
                                                            handleAssign(
                                                                store.id,
                                                                v
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Pilih SPV..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {spvMembers.map(
                                                                (spv) => (
                                                                    <SelectItem
                                                                        key={
                                                                            spv.id
                                                                        }
                                                                        value={spv.id.toString()}
                                                                    >
                                                                        {
                                                                            spv.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {store.spv_id && (
                                                        <button
                                                            onClick={() =>
                                                                handleUnassign(
                                                                    store.id
                                                                )
                                                            }
                                                            className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            Lepas
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
