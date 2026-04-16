import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { BookOpen, FolderGit2, Shield, Tag, Users2, Plus } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
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
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';
import { useMainNav } from '@/hooks/use-main-nav';
import * as TeamActions from '@/actions/App/Http/Controllers/TeamController';

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const mainNavGroups = useMainNav();
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', grouping: 'team' as 'hq' | 'team' | 'project' });
    const [saving, setSaving] = useState(false);

    const handleCreate = () => {
        if (!form.name.trim() || saving) return;
        setSaving(true);
        router.post(TeamActions.store.url(), form, {
            preserveScroll: true,
            onSuccess: () => {
                setForm({ name: '', grouping: 'team' });
                setOpen(false);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    return (
        <>
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href={dashboard()} prefetch>
                                    <AppLogo />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    {/* Quick-add team button — admin only, above Platform group */}
                    {isAdmin && (
                        <div className="px-3 pt-2 pb-1">
                            <button
                                onClick={() => setOpen(true)}
                                className="flex w-full items-center gap-2 rounded-md border border-dashed border-sidebar-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Tim Baru</span>
                            </button>
                        </div>
                    )}

                    <NavMain groups={mainNavGroups} />

                    {isAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/teams/manage">
                                            <Users2 className="w-4 h-4" />
                                            <span>Manajemen Tim</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/members">
                                            <Shield className="w-4 h-4" />
                                            <span>Manajemen Anggota</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/tags">
                                            <Tag className="w-4 h-4" />
                                            <span>Manajemen Tag</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter>
                    <NavFooter items={footerNavItems} className="mt-auto" />
                    <NavUser />
                </SidebarFooter>
            </Sidebar>

            {/* Global Create Team Modal */}
            <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Tambah Tim Baru</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Kategori
                            </label>
                            <Select
                                value={form.grouping}
                                onValueChange={(v) => setForm({ ...form, grouping: v as typeof form.grouping })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hq">🏢 HQ</SelectItem>
                                    <SelectItem value="team">👥 Tim</SelectItem>
                                    <SelectItem value="project">📋 Proyek</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Nama
                            </label>
                            <Input
                                autoFocus
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') setOpen(false);
                                }}
                                placeholder="Nama tim..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
                                {saving ? 'Menyimpan...' : 'Buat'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
