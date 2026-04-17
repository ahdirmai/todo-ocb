import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

import { OverviewTab } from './partials/overview-tab';
import { ChatTab } from './partials/chat-tab';
import { PengumumanTab } from './partials/pengumuman-tab';
import { PertanyaanTab } from './partials/pertanyaan-tab';
import { DokumenTab } from './partials/dokumen-tab';
import { TugasTab } from './partials/tugas-tab';
import { ActivityTab } from './partials/activity-tab';

type Tab =
    | 'overview'
    | 'task'
    | 'chat'
    | 'announcement'
    | 'document'
    | 'activity';

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    task: 'Tugas',
    chat: 'Chat',
    announcement: 'Pengumuman',
    document: 'Dokumen & File',
    activity: 'Aktivitas',
};

export default function TeamShow({
    team,
    tab,
    item,
}: {
    team: any;
    tab: Tab;
    item?: string;
}) {
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
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header Team Area */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {team.name}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {team.users
                                ?.slice(0, 3)
                                .map((u: any, i: number) => (
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
                    <div className="border-b border-sidebar-border/70 px-6">
                        <TabsList className="h-auto w-full justify-start space-x-6 bg-transparent p-0">
                            {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
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
                            className="m-0 flex h-full flex-col p-6"
                        >
                            <OverviewTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="task"
                            className="m-0 flex h-full flex-col p-0"
                        >
                            <TugasTab team={team} item={item} />
                        </TabsContent>
                        <TabsContent
                            value="chat"
                            className="m-0 flex h-full flex-col overflow-hidden p-0"
                        >
                            <ChatTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="announcement"
                            className="m-0 flex h-full flex-col p-6"
                        >
                            <PengumumanTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="document"
                            className="m-0 flex h-full flex-col p-6"
                        >
                            <DokumenTab team={team} />
                        </TabsContent>
                        <TabsContent
                            value="activity"
                            className="m-0 flex h-full flex-col p-6"
                        >
                            <ActivityTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </>
    );
}
