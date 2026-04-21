import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Archive,
    ArchiveRestore,
    Building,
    Users,
    CheckSquare,
} from 'lucide-react';
import { useState } from 'react';
import * as TeamActions from '@/actions/App/Http/Controllers/TeamController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const GROUPING_CONFIG = {
    hq: { label: 'HQ', icon: Building, color: 'bg-blue-100 text-blue-700' },
    team: {
        label: 'Tim',
        icon: Users,
        color: 'bg-emerald-100 text-emerald-700',
    },
    project: {
        label: 'Proyek',
        icon: CheckSquare,
        color: 'bg-purple-100 text-purple-700',
    },
};

type Grouping = 'hq' | 'team' | 'project';

interface Team {
    id: string;
    name: string;
    slug: string;
    grouping: Grouping;
    is_active: boolean;
}

export default function TeamsManage() {
    const { allTeamsData } = usePage<any>().props;

    setLayoutProps({
        breadcrumbs: [{ title: 'Manajemen Tim', href: '/teams/manage' }],
    });

    const allTeams: Team[] = [
        ...(allTeamsData?.hq ?? []),
        ...(allTeamsData?.team ?? []),
        ...(allTeamsData?.project ?? []),
    ];

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Team | null>(null);
    const [form, setForm] = useState({
        name: '',
        grouping: 'team' as Grouping,
    });
    const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [search, setSearch] = useState('');

    const openCreate = (grouping: Grouping = 'team') => {
        setEditing(null);
        setForm({ name: '', grouping });
        setOpen(true);
    };

    const openEdit = (team: Team) => {
        setEditing(team);
        setForm({ name: team.name, grouping: team.grouping });
        setOpen(true);
    };

    const handleSubmit = () => {
        if (editing) {
            router.put(TeamActions.update.url(editing.id), form, {
                onSuccess: () => setOpen(false),
            });
        } else {
            router.post(TeamActions.store.url(), form, {
                onSuccess: () => setOpen(false),
            });
        }
    };

    const handleArchive = (team: Team) => {
        router.patch(TeamActions.archive.url(team.id));
    };

    const handleRestore = (team: Team) => {
        router.patch(TeamActions.restore.url(team.id));
    };

    const handleDelete = (team: Team) => {
        if (
            !confirm(
                `Hapus permanen "${team.name}"? Semua data di dalamnya akan hilang.`,
            )
        ) {
            return;
        }

        router.delete(TeamActions.destroy.url(team.id));
    };

    const filteredTeams = allTeams.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all'
                ? true
                : filter === 'active'
                  ? t.is_active
                  : !t.is_active;

        return matchSearch && matchFilter;
    });

    return (
        <>
            <Head title="Manajemen Tim" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Manajemen Tim
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {allTeams.length} total ·{' '}
                            {allTeams.filter((t) => t.is_active).length} aktif
                        </p>
                    </div>
                    <Button onClick={() => openCreate()} className="gap-2">
                        <Plus className="h-4 w-4" /> Buat Tim
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 border-b border-sidebar-border/50 px-6 py-3">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama tim..."
                        className="h-8 max-w-xs text-sm"
                    />
                    <div className="flex gap-1">
                        {(['all', 'active', 'archived'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    filter === f
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {f === 'all'
                                    ? 'Semua'
                                    : f === 'active'
                                      ? 'Aktif'
                                      : 'Diarsipkan'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Teams Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Nama Tim
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Kategori
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Slug
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/50">
                                {filteredTeams.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center text-sm text-muted-foreground"
                                        >
                                            Tidak ada tim ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTeams.map((team) => {
                                        const cfg =
                                            GROUPING_CONFIG[team.grouping];
                                        const Icon = cfg.icon;

                                        return (
                                            <tr
                                                key={team.id}
                                                className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 ${!team.is_active ? 'opacity-60' : ''}`}
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                                    {team.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        className={`${cfg.color} gap-1 border-none text-xs font-medium`}
                                                    >
                                                        <Icon className="h-3 w-3" />{' '}
                                                        {cfg.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                    {team.slug}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {team.is_active ? (
                                                        <Badge className="border-none bg-emerald-100 text-xs text-emerald-700">
                                                            Aktif
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="border-none bg-slate-100 text-xs text-slate-500">
                                                            Diarsipkan
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-44"
                                                            >
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            team,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />{' '}
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                {team.is_active ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleArchive(
                                                                                team,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Archive className="mr-2 h-4 w-4" />{' '}
                                                                        Arsipkan
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleRestore(
                                                                                team,
                                                                            )
                                                                        }
                                                                    >
                                                                        <ArchiveRestore className="mr-2 h-4 w-4" />{' '}
                                                                        Pulihkan
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            team,
                                                                        )
                                                                    }
                                                                    className="text-red-600 focus:text-red-600"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />{' '}
                                                                    Hapus
                                                                    Permanen
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? `Edit Tim — ${editing.name}`
                                : 'Buat Tim Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Nama Tim
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="Nama tim..."
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleSubmit()
                                }
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Kategori
                            </label>
                            <Select
                                value={form.grouping}
                                onValueChange={(v) =>
                                    setForm({
                                        ...form,
                                        grouping: v as Grouping,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hq">HQ</SelectItem>
                                    <SelectItem value="team">Tim</SelectItem>
                                    <SelectItem value="project">
                                        Proyek
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
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
