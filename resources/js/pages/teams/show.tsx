import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ActivityTab } from './partials/activity-tab';
import { ChatTab } from './partials/chat-tab';
import { DokumenTab } from './partials/dokumen-tab';
import { OverviewTab } from './partials/overview-tab';
import { PengumumanTab } from './partials/pengumuman-tab';
import { SopTab } from './partials/sop-tab';
import { TugasTab } from './partials/tugas-tab';

type Tab =
    | 'overview'
    | 'task'
    | 'chat'
    | 'announcement'
    | 'document'
    | 'sop'
    | 'activity';

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    task: 'Tugas',
    chat: 'Chat',
    announcement: 'Pengumuman',
    document: 'Dokumen & File',
    sop: 'SOP',
    activity: 'Aktivitas',
};

export default function TeamShow({
    team,
    tab,
}: {
    team: any;
    tab: Tab;
}) {
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );

    const visibleTabs = (Object.keys(TAB_LABELS) as Tab[]).filter(
        (key) => {
            if (key === 'activity' || key === 'sop') {
                return isAdmin;
            }

            return true;
        },
    );

    const [showMembersModal, setShowMembersModal] = useState(false);

    setLayoutProps({
        breadcrumbs: [{ title: team.name, href: `/teams/${team.slug}` }],
    });

    const handleTabChange = (value: string) => {
        router.visit(`/teams/${team.slug}/${value}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={team.name} />
            <div className="mx-auto flex h-full w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header Team Area */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {team.name}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div
                            className="flex cursor-pointer -space-x-2 transition-opacity hover:opacity-80"
                            onClick={() => setShowMembersModal(true)}
                        >
                            {team.users
                                ?.slice(0, 3)
                                .map((u: any) => (
                                    <Avatar
                                        key={u.id}
                                        className="h-8 w-8 border-2 border-white dark:border-zinc-950"
                                    >
                                        <AvatarImage
                                            src={u.avatar_url ?? undefined}
                                            alt={u.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback>
                                            {u.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            {team.users?.length > 3 && (
                                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600 dark:border-zinc-950 dark:bg-zinc-800 dark:text-slate-300">
                                    +{team.users.length - 3}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Tabs
                    value={tab}
                    onValueChange={handleTabChange}
                    className="flex h-full w-full flex-1 flex-col overflow-hidden"
                >
                    <div className="w-full overflow-x-auto border-b border-sidebar-border/70 px-6 scrollbar-hide">
                        <TabsList className="flex h-auto w-max min-w-full justify-start space-x-6 bg-transparent p-0 pb-1">
                            {visibleTabs.map((key) => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="rounded-none px-0 pt-2 pb-3 text-sm font-medium text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-slate-100"
                                >
                                    {TAB_LABELS[key]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <TabsContent
                            value="overview"
                            className="m-0 flex h-full flex-col overflow-y-auto p-6"
                        >
                            <OverviewTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="task"
                            className="m-0 flex h-full flex-col p-0"
                        >
                            <TugasTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="chat"
                            className="m-0 flex h-full flex-col overflow-hidden p-0"
                        >
                            <ChatTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="announcement"
                            className="m-0 flex h-full flex-col overflow-y-auto p-6"
                        >
                            <PengumumanTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="document"
                            className="m-0 flex h-full flex-col overflow-y-auto p-6"
                        >
                            <DokumenTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="sop"
                            className="m-0 flex h-full flex-col overflow-y-auto p-6"
                        >
                            <SopTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="activity"
                            className="m-0 flex h-full flex-col overflow-y-auto p-6"
                        >
                            <ActivityTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <Dialog
                open={showMembersModal}
                onOpenChange={setShowMembersModal}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Anggota Tim — {team.name}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 flex flex-col gap-4">
                        {team.users?.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage
                                        src={u.avatar_url ?? undefined}
                                        alt={u.name}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                        {u.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {u.name}
                                    </span>
                                    {u.position && (
                                        <span className="text-xs text-muted-foreground">
                                            {u.position}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
