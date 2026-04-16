import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, ShieldCheck, Shield, User } from 'lucide-react';
import * as MemberActions from '@/actions/App/Http/Controllers/MemberController';

interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    superadmin: { label: 'Superadmin', color: 'bg-red-100 text-red-700',    icon: ShieldCheck },
    admin:      { label: 'Admin',      color: 'bg-amber-100 text-amber-700', icon: Shield },
    member:     { label: 'Member',     color: 'bg-slate-100 text-slate-600', icon: User },
};

export default function MembersIndex({ members, roles }: { members: Member[]; roles: string[] }) {
    const { auth } = usePage<any>().props;

    const [inviteOpen, setInviteOpen] = useState(false);
    const [editMember, setEditMember] = useState<Member | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
    const [editRole, setEditRole] = useState('');

    const handleInvite = () => {
        router.post(MemberActions.store.url(), form, {
            onSuccess: () => { setInviteOpen(false); setForm({ name: '', email: '', password: '', role: 'member' }); },
        });
    };

    const handleChangeRole = () => {
        if (!editMember) return;
        router.put(MemberActions.update.url(editMember.id), { role: editRole }, {
            onSuccess: () => setEditMember(null),
        });
    };

    const handleDelete = (member: Member) => {
        if (!confirm(`Hapus anggota ${member.name}?`)) return;
        router.delete(MemberActions.destroy.url(member.id));
    };

    return (
        <>
            <Head title="Manajemen Anggota" />
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sidebar-border/70">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manajemen Anggota</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{members.length} anggota terdaftar</p>
                    </div>
                    <Button onClick={() => setInviteOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Undang Anggota
                    </Button>
                </div>

                {/* Member Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="rounded-xl border border-sidebar-border/70 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nama</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Role</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/50">
                                {members.map((m) => {
                                    const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {m.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {m.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge className={`${cfg.color} border-none gap-1 font-semibold`}>
                                                    <Icon className="w-3 h-3" /> {cfg.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {m.id !== auth.user.id && (
                                                        <>
                                                            <Button
                                                                variant="ghost" size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => { setEditMember(m); setEditRole(m.role); }}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost" size="sm"
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDelete(m)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            <Dialog open={inviteOpen} onOpenChange={(v) => !v && setInviteOpen(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Undang Anggota Baru</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama</label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
                            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 karakter" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setInviteOpen(false)}>Batal</Button>
                            <Button onClick={handleInvite}>Undang</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={!!editMember} onOpenChange={(v) => !v && setEditMember(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Ubah Role — {editMember?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {roles.map((r) => <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditMember(null)}>Batal</Button>
                            <Button onClick={handleChangeRole}>Simpan</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

MembersIndex.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Manajemen Anggota', href: '/members' }]}>
        {page}
    </AppLayout>
);
