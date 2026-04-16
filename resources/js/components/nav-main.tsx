import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronRight, Plus, MoreHorizontal, Pencil, Archive } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup } from '@/types';
import * as TeamActions from '@/actions/App/Http/Controllers/TeamController';

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    // Create modal state
    const [createModal, setCreateModal] = useState<{ open: boolean; grouping: string }>({
        open: false,
        grouping: 'team',
    });
    const [newTeamName, setNewTeamName] = useState('');
    const [saving, setSaving] = useState(false);

    // Edit modal state
    const [editModal, setEditModal] = useState<{ open: boolean; team: any | null }>({
        open: false,
        team: null,
    });
    const [editName, setEditName] = useState('');

    const handleCreate = () => {
        if (!newTeamName.trim() || saving) return;
        setSaving(true);
        router.post(TeamActions.store.url(), {
            name: newTeamName.trim(),
            grouping: createModal.grouping,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewTeamName('');
                setCreateModal({ open: false, grouping: 'team' });
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    const handleEdit = () => {
        if (!editName.trim() || !editModal.team || saving) return;
        setSaving(true);
        router.put(TeamActions.update.url(editModal.team.id), {
            name: editName.trim(),
            grouping: editModal.team.grouping ?? editModal.team.grouping,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditModal({ open: false, team: null });
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    const handleArchive = (team: any) => {
        router.patch(TeamActions.archive.url(team.id), {}, { preserveScroll: true });
    };

    return (
        <>
            {groups.map((group) => (
                <Collapsible key={group.title} defaultOpen className="group/collapsible">
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel
                            asChild
                            className="flex items-center space-x-2 w-full justify-between cursor-pointer"
                        >
                            <CollapsibleTrigger>
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    {group.icon && <group.icon className="h-4 w-4 shrink-0" />}
                                    <span className="truncate">{group.title}</span>
                                </div>
                                <div className="flex items-center gap-1 ml-auto shrink-0">
                                    {/* + button for admin on team groups */}
                                    {isAdmin && (group as any).grouping && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewTeamName('');
                                                setCreateModal({ open: true, grouping: (group as any).grouping });
                                            }}
                                            className="flex items-center justify-center w-4 h-4 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded"
                                            title={`Tambah ${group.title}`}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    )}
                                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </div>
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>

                        <CollapsibleContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title} className="group/item">
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isCurrentUrl(item.href)}
                                            tooltip={{ children: item.title }}
                                        >
                                            <Link href={item.href} prefetch>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>

                                        {/* Dropdown per item — admin only */}
                                        {isAdmin && (item as any).id && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <SidebarMenuAction
                                                        showOnHover
                                                        className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </SidebarMenuAction>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent side="right" align="start" className="w-36">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditName((item as any).title);
                                                            setEditModal({ open: true, team: item });
                                                        }}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleArchive(item)}
                                                        className="text-amber-600 focus:text-amber-600"
                                                    >
                                                        <Archive className="w-3.5 h-3.5 mr-2" /> Arsipkan
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
            ))}

            {/* Create Team Modal */}
            <Dialog open={createModal.open} onOpenChange={(v) => !v && setCreateModal({ ...createModal, open: false })}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            Tambah {createModal.grouping === 'hq' ? 'HQ' : createModal.grouping === 'team' ? 'Tim' : 'Proyek'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-1">
                        <Input
                            autoFocus
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setCreateModal({ ...createModal, open: false });
                            }}
                            placeholder="Nama tim..."
                            className="h-8 text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setCreateModal({ ...createModal, open: false })}
                            >
                                Batal
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleCreate}
                                disabled={saving || !newTeamName.trim()}
                            >
                                {saving ? 'Menyimpan...' : 'Tambah'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Team Modal */}
            <Dialog open={editModal.open} onOpenChange={(v) => !v && setEditModal({ open: false, team: null })}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Rename Tim</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-1">
                        <Input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEdit();
                                if (e.key === 'Escape') setEditModal({ open: false, team: null });
                            }}
                            placeholder="Nama baru..."
                            className="h-8 text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditModal({ open: false, team: null })}
                            >
                                Batal
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleEdit}
                                disabled={saving || !editName.trim()}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
