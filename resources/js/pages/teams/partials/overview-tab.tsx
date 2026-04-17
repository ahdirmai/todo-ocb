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
import { UserPlus, MoreHorizontal, Trash2, Building, UsersRound, Kanban, CheckSquare } from 'lucide-react';
import * as TeamMemberActions from '@/actions/App/Http/Controllers/TeamMemberController';

const ROLE_STYLE: Record<string, string> = {
    admin:  'bg-amber-100 text-amber-700',
    member: 'bg-slate-100 text-slate-600',
};

export function OverviewTab({ team }: { team: any }) {
    const { auth, allUsers = [] } = usePage<any>().props;
    const isAdmin = auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');

    const [inviteOpen, setInviteOpen] = useState(false);
    const [search, setSearch] = useState('');

    const invitableUsers = allUsers?.filter((u: any) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900 flex items-center gap-3">
                    <UsersRound className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{team.users?.length ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Total Anggota</p>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900 flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{team.tasks_count ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Total Tugas</p>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900 flex items-center gap-3">
                    <Kanban className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{team.kanbans?.length ?? 1}</p>
                        <p className="text-xs text-muted-foreground">Kanban Board</p>
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
                        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setInviteOpen(true)}>
                            <UserPlus className="w-3.5 h-3.5" /> Tambah Anggota
                        </Button>
                    )}
                </div>

                <div className="rounded-xl border border-sidebar-border/70 overflow-hidden">
                    {team.users?.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Belum ada anggota
                        </div>
                    ) : (
                        <div className="divide-y divide-sidebar-border/50">
                            {team.users?.map((user: any) => {
                                const teamUser = team.users?.find((u: any) => u.id === user.id);
                                const pivotRole = teamUser?.pivot?.role;

                                return (
                                    <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                        
                                        <Badge className={`${ROLE_STYLE[pivotRole ?? 'member']} border-none text-xs shrink-0`}>
                                            {pivotRole === 'admin' ? 'Admin' : 'Member'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            <Dialog open={inviteOpen} onOpenChange={(v) => !v && setInviteOpen(false)}>
                <DialogContent className="max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>Tambah Anggota Tim — {team.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
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
                        <div className="rounded-lg border border-sidebar-border/70 overflow-hidden max-h-64 overflow-y-auto bg-slate-50/30 dark:bg-zinc-900/30">
                            {invitableUsers.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-4 text-center">Tidak ditemukan</p>
                            ) : (
                                <div className="divide-y divide-sidebar-border/50">
                                    {invitableUsers.map((u: any) => {
                                        const isAssigned = team.users?.some((tu: any) => tu.id === u.id);
                                        const isGlobalAdmin = u.roles?.some((r: any) => r.name === 'superadmin' || r.name === 'admin');
                                        const isDisabled = isGlobalAdmin || u.id === auth.user.id;

                                        return (
                                            <div
                                                key={u.id}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                <Checkbox
                                                    checked={isAssigned || isGlobalAdmin}
                                                    disabled={isDisabled}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            router.post(TeamMemberActions.store.url(team.id), { user_id: u.id, role: 'member' }, { preserveScroll: true });
                                                        } else {
                                                            router.delete(TeamMemberActions.destroy.url([team.id, u.id]), { preserveScroll: true });
                                                        }
                                                    }}
                                                    className={`shrink-0 ${isDisabled ? 'opacity-50' : ''}`}
                                                />
                                                <Avatar className="w-7 h-7 shrink-0">
                                                    <AvatarImage src={u.avatar_url ?? undefined} alt={u.name} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-none">
                                                        {u.name} {u.id === auth.user.id && '(Anda)'}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{u.email}</p>
                                                </div>
                                                {isGlobalAdmin && (
                                                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-none px-1.5 py-0">Global</Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Tutup</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
