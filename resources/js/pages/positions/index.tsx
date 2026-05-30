import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Users, UserPlus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as PositionActions from '@/actions/App/Http/Controllers/PositionController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface User {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    position: string | null;
}

interface Position {
    id: string;
    name: string;
    description: string | null;
    users_count: number;
    users: User[];
}

type PaginatedPositions = {
    data: Position[];
    total: number;
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

export default function PositionsIndex() {
    const { positions } = usePage<{ positions: PaginatedPositions }>().props;

    setLayoutProps({
        breadcrumbs: [{ title: 'Manajemen Posisi', href: '/positions' }],
    });

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Position | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [viewingUsers, setViewingUsers] = useState<Position | null>(null);
    const [usersWithoutPosition, setUsersWithoutPosition] = useState<User[]>(
        []
    );
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [positionName, setPositionName] = useState<string>('');

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '' });
        setOpen(true);
    };

    const openEdit = (position: Position) => {
        setEditing(position);
        setForm({ name: position.name, description: position.description || '' });
        setOpen(true);
    };

    const handleSubmit = () => {
        if (editing) {
            router.put(PositionActions.update.url(editing.id), form, {
                onSuccess: () => setOpen(false),
            });
        } else {
            router.post(PositionActions.store.url(), form, {
                onSuccess: () => setOpen(false),
            });
        }
    };

    const handleDelete = (position: Position) => {
        if (position.users_count > 0) {
            alert(
                `Tidak dapat menghapus posisi "${position.name}" karena masih digunakan oleh ${position.users_count} user.`
            );
            return;
        }

        if (!confirm(`Hapus posisi "${position.name}"?`)) {
            return;
        }

        router.delete(PositionActions.destroy.url(position.id));
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const selectedUser = usersWithoutPosition.find((u) => u.id === userId);
        if (selectedUser?.position) {
            setPositionName(selectedUser.position);
        } else {
            setPositionName('');
        }
    };

    const handleAssignUser = () => {
        if (!selectedUserId || !viewingUsers) return;

        const selectedUser = usersWithoutPosition.find(
            (u) => u.id === selectedUserId
        );
        if (!selectedUser) return;

        // Optimistically update local state
        setViewingUsers({
            ...viewingUsers,
            users: [
                ...viewingUsers.users,
                {
                    ...selectedUser,
                    avatar_url: null,
                    position: positionName || null,
                },
            ],
            users_count: viewingUsers.users_count + 1,
        });

        setUsersWithoutPosition(
            usersWithoutPosition.filter((u) => u.id !== selectedUserId)
        );
        setSelectedUserId('');
        setPositionName('');

        router.post(
            PositionActions.assignUser.url(viewingUsers.id),
            { user_id: selectedUserId, position: positionName },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['positions'] });
                },
            }
        );
    };

    const handleRemoveUser = (userId: string, userName: string) => {
        if (!viewingUsers) return;

        if (!confirm(`Hapus ${userName} dari kelompok posisi ini?`)) {
            return;
        }

        // Optimistically update local state
        setViewingUsers({
            ...viewingUsers,
            users: viewingUsers.users.filter((u) => u.id !== userId),
            users_count: viewingUsers.users_count - 1,
        });

        router.delete(PositionActions.removeUser.url(viewingUsers.id), {
            data: { user_id: userId },
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['positions'] });
            },
        });
    };

    const fetchUsersWithoutPosition = async () => {
        try {
            const response = await fetch(
                PositionActions.usersWithoutPosition.url()
            );
            const data = await response.json();
            setUsersWithoutPosition(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    useEffect(() => {
        if (viewingUsers) {
            fetchUsersWithoutPosition();
        }
    }, [viewingUsers]);

    return (
        <>
            <Head title="Manajemen Posisi" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div>
                        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Manajemen Posisi
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Total {positions.total} posisi tersedia
                        </p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Buat Posisi
                    </Button>
                </div>

                {/* Position Grid */}
                <div className="flex flex-1 flex-col overflow-auto p-6">
                    <div className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {positions.data.length === 0 ? (
                            <p className="col-span-full rounded-xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                                Belum ada posisi yang dibuat.
                            </p>
                        ) : (
                            positions.data.map((position: Position) => (
                                <div
                                    key={position.id}
                                    onClick={() => setViewingUsers(position)}
                                    className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-sidebar-border/70 bg-white p-4 transition-colors hover:border-primary/30 dark:bg-zinc-900"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                                {position.name}
                                            </h3>
                                            {position.description && (
                                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                    {position.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEdit(position);
                                                }}
                                                className="rounded p-1 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(position);
                                                }}
                                                className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                disabled={position.users_count > 0}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{position.users_count} user</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {positions.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-sidebar-border/70 pt-6">
                            <p className="text-xs text-muted-foreground">
                                Halaman {positions.current_page} dari{' '}
                                {positions.last_page} · Menampilkan{' '}
                                {positions.data.length} data
                            </p>
                            <div className="flex gap-2">
                                {positions.prev_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(positions.prev_page_url!)
                                        }
                                    >
                                        ← Sebelumnya
                                    </Button>
                                )}
                                {positions.next_page_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() =>
                                            router.visit(positions.next_page_url!)
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
                            {editing ? 'Edit Posisi' : 'Buat Posisi Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Nama Posisi
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="Contoh: Manager, Staff, SPV..."
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleSubmit()
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Deskripsi (Opsional)
                            </label>
                            <Textarea
                                value={form.description}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                                placeholder="Deskripsi singkat tentang posisi ini..."
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
                                {editing ? 'Simpan' : 'Buat'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Users Modal */}
            <Dialog
                open={!!viewingUsers}
                onOpenChange={(v) => {
                    if (!v) {
                        setViewingUsers(null);
                        setSelectedUserId('');
                    }
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Anggota Posisi: {viewingUsers?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-4">
                        {/* Assign User Section */}
                        {usersWithoutPosition.filter(
                            (u) =>
                                !viewingUsers?.users.some(
                                    (vu) => vu.id === u.id,
                                ),
                        ).length > 0 && (
                            <div className="rounded-lg border border-sidebar-border/70 bg-slate-50 p-3 dark:bg-zinc-900">
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                    Tambah Anggota
                                </label>
                                <div className="flex flex-col gap-2">
                                    <Select
                                        value={selectedUserId}
                                        onValueChange={handleUserSelect}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih user..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {usersWithoutPosition
                                                .filter(
                                                    (u) =>
                                                        !viewingUsers?.users.some(
                                                            (vu) =>
                                                                vu.id === u.id,
                                                        ),
                                                )
                                                .map((user) => (
                                                    <SelectItem
                                                        key={user.id}
                                                        value={user.id}
                                                    >
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={positionName}
                                        onChange={(e) =>
                                            setPositionName(e.target.value)
                                        }
                                        placeholder="Contoh: SPV Marketing, Staff Gudang..."
                                    />
                                    <Button
                                        onClick={handleAssignUser}
                                        disabled={!selectedUserId}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Assign
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Users List */}
                        {viewingUsers && viewingUsers.users.length === 0 ? (
                            <p className="rounded-lg border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                                Belum ada user dengan posisi ini.
                            </p>
                        ) : (
                            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                                {viewingUsers?.users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="group flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-white p-3 transition-colors hover:border-red-200 dark:bg-zinc-900 dark:hover:border-red-900/30"
                                    >
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                            {user.position && (
                                                <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {user.position}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleRemoveUser(
                                                    user.id,
                                                    user.name
                                                )
                                            }
                                            className="rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
                                            title="Hapus dari kelompok"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
