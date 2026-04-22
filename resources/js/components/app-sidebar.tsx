import { Link, router, usePage } from '@inertiajs/react';
import {
    Shield,
    Tag,
    Users2,
    Plus,
    Moon,
    Sun,
    Activity,
    Binoculars,
} from 'lucide-react';
import { useState } from 'react';
import * as TeamActions from '@/actions/App/Http/Controllers/TeamController';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
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
import { useAppearance } from '@/hooks/use-appearance';
import { useMainNav } from '@/hooks/use-main-nav';
import { dashboard } from '@/routes';
import { nightwatch } from '@/routes';
import type { NavItem } from '@/types';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const mainNavGroups = useMainNav();
    const { auth } = usePage<any>().props;
    const isAdmin =
        auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');
    const isSuperadmin = auth?.roles?.includes('superadmin');
    const { appearance, updateAppearance } = useAppearance();

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        grouping: 'team' as 'hq' | 'team' | 'project',
    });
    const [saving, setSaving] = useState(false);

    const handleCreate = () => {
        if (!form.name.trim() || saving) {
            return;
        }

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
                        <SidebarGroup className="px-2 py-2">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => setOpen(true)}
                                        tooltip="Tambah Tim Baru"
                                        className="justify-center border border-dashed border-sidebar-border/70 text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    >
                                        <Plus className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            Tambah Tim Baru
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}

                    <NavMain groups={mainNavGroups} />

                    {isAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/teams/manage">
                                            <Users2 className="h-4 w-4" />
                                            <span>Manajemen Tim</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/members">
                                            <Shield className="h-4 w-4" />
                                            <span>Manajemen Anggota</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/tags">
                                            <Tag className="h-4 w-4" />
                                            <span>Manajemen Tag</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {isSuperadmin && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href={nightwatch()}>
                                                <Binoculars className="h-4 w-4" />
                                                <span>Nightwatch</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/activity">
                                            <Activity className="h-4 w-4" />
                                            <span>Log Aktivitas</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() =>
                                    updateAppearance(
                                        appearance === 'dark'
                                            ? 'light'
                                            : 'dark',
                                    )
                                }
                                tooltip={
                                    appearance === 'dark'
                                        ? 'Mode Terang'
                                        : 'Mode Gelap'
                                }
                                className="flex w-full items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    {appearance === 'dark' ? (
                                        <Moon className="h-4 w-4" />
                                    ) : (
                                        <Sun className="h-4 w-4" />
                                    )}
                                    <span>
                                        {appearance === 'dark'
                                            ? 'Mode Gelap'
                                            : 'Mode Terang'}
                                    </span>
                                </div>
                                <div
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${appearance === 'dark' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <span
                                        className={`pointer-events-none block h-3 w-3 rounded-full bg-white shadow-lg ring-0 transition-transform ${appearance === 'dark' ? 'translate-x-3' : 'translate-x-0'}`}
                                    />
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
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
                    <div className="mt-2 flex flex-col gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Kategori
                            </label>
                            <Select
                                value={form.grouping}
                                onValueChange={(v) =>
                                    setForm({
                                        ...form,
                                        grouping: v as typeof form.grouping,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hq">🏢 HQ</SelectItem>
                                    <SelectItem value="team">👥 Tim</SelectItem>
                                    <SelectItem value="project">
                                        📋 Proyek
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Nama
                            </label>
                            <Input
                                autoFocus
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
handleCreate();
}

                                    if (e.key === 'Escape') {
setOpen(false);
}
                                }}
                                placeholder="Nama tim..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={saving || !form.name.trim()}
                            >
                                {saving ? 'Menyimpan...' : 'Buat'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
