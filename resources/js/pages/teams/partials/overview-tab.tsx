import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    UserPlus,
    MoreHorizontal,
    Trash2,
    Building,
    UsersRound,
    Kanban,
    CheckSquare,
} from 'lucide-react';
import * as TeamMemberActions from '@/actions/App/Http/Controllers/TeamMemberController';

const ROLE_STYLE: Record<string, string> = {
    admin: 'bg-amber-100 text-amber-700',
    member: 'bg-slate-100 text-slate-600',
};

export function OverviewTab({ team }: { team: any }) {
    const { auth, allUsers = [] } = usePage<any>().props;
    const isAdmin =
        auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    const [inviteOpen, setInviteOpen] = useState(false);
    const [search, setSearch] = useState('');

    const invitableUsers =
        allUsers?.filter(
            (u: any) =>
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()),
        ) ?? [];

    return (
        <div className="flex h-full flex-col gap-6 overflow-auto p-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-white p-4 dark:bg-zinc-900">
                    <UsersRound className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {team.users?.length ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total Anggota
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-white p-4 dark:bg-zinc-900">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {team.tasks_count ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total Tugas
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-white p-4 dark:bg-zinc-900">
                    <Kanban className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {team.kanbans?.length ?? 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Kanban Board
                        </p>
                    </div>
                </div>
            </div>

            {/* Members Section */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Anggota Tim ({team.users?.length ?? 0})
                    </h3>
                    {isAdmin && (
                        <Button
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => setInviteOpen(true)}
                        >
                            <UserPlus className="h-3.5 w-3.5" /> Tambah Anggota
                        </Button>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70">
                    {team.users?.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Belum ada anggota
                        </div>
                    ) : (
                        <div className="divide-y divide-sidebar-border/50">
                            {team.users?.map((user: any) => {
                                const teamUser = team.users?.find(
                                    (u: any) => u.id === user.id,
                                );
                                const pivotRole = teamUser?.pivot?.role;

                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                                    >
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={
                                                    user.avatar_url ?? undefined
                                                }
                                                alt={user.name}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                                {user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {user.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>

                                        <Badge
                                            className={`${ROLE_STYLE[pivotRole ?? 'member']} shrink-0 border-none text-xs`}
                                        >
                                            {pivotRole === 'admin'
                                                ? 'Admin'
                                                : 'Member'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            <Dialog
                open={inviteOpen}
                onOpenChange={(v) => !v && setInviteOpen(false)}
            >
                <DialogContent
                    className="max-w-md"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>
                            Tambah Anggota Tim — {team.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col gap-3">
                        <div>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama atau email..."
                                autoFocus
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* User list */}
                        <div className="max-h-64 overflow-hidden overflow-y-auto rounded-lg border border-sidebar-border/70 bg-slate-50/30 dark:bg-zinc-900/30">
                            {invitableUsers.length === 0 ? (
                                <p className="p-4 text-center text-xs text-muted-foreground">
                                    Tidak ditemukan
                                </p>
                            ) : (
                                <div className="divide-y divide-sidebar-border/50">
                                    {invitableUsers.map((u: any) => {
                                        const isAssigned = team.users?.some(
                                            (tu: any) => tu.id === u.id,
                                        );
                                        const isGlobalAdmin = u.roles?.some(
                                            (r: any) =>
                                                r.name === 'superadmin' ||
                                                r.name === 'admin',
                                        );
                                        const isDisabled =
                                            isGlobalAdmin ||
                                            u.id === auth.user.id;

                                        return (
                                            <div
                                                key={u.id}
                                                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800"
                                            >
                                                <Checkbox
                                                    checked={
                                                        isAssigned ||
                                                        isGlobalAdmin
                                                    }
                                                    disabled={isDisabled}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) => {
                                                        if (checked) {
                                                            router.post(
                                                                TeamMemberActions.store.url(
                                                                    team.id,
                                                                ),
                                                                {
                                                                    user_id:
                                                                        u.id,
                                                                    role: 'member',
                                                                },
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        } else {
                                                            router.delete(
                                                                TeamMemberActions.destroy.url(
                                                                    [
                                                                        team.id,
                                                                        u.id,
                                                                    ],
                                                                ),
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                    className={`shrink-0 ${isDisabled ? 'opacity-50' : ''}`}
                                                />
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage
                                                        src={
                                                            u.avatar_url ??
                                                            undefined
                                                        }
                                                        alt={u.name}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                                        {u.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm leading-none font-medium text-slate-800 dark:text-slate-200">
                                                        {u.name}{' '}
                                                        {u.id ===
                                                            auth.user.id &&
                                                            '(Anda)'}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                        {u.email}
                                                    </p>
                                                </div>
                                                {isGlobalAdmin && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-none bg-slate-100 px-1.5 py-0 text-[10px] text-slate-500"
                                                    >
                                                        Global
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInviteOpen(false)}
                            >
                                Tutup
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
