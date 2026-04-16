import { Head, router, usePage } from '@inertiajs/react';
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

type Tab = 'overview' | 'task' | 'chat' | 'announcement' | 'question' | 'document';

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    task: 'Tugas',
    chat: 'Chat',
    announcement: 'Pengumuman',
    question: 'Pertanyaan',
    document: 'Dokumen & File',
};

export default function TeamShow({ team, tab, item }: { team: any; tab: Tab; item?: string }) {
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{team.name}</h1>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {team.users?.slice(0, 3).map((u: any, i: number) => (
                                <Avatar key={u.id} className="w-8 h-8 border-2 border-white dark:border-zinc-950">
                                    <AvatarImage src={`https://i.pravatar.cc/100?img=${i + 10}`} />
                                    <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {team.users?.length > 3 && (
                                <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-zinc-950 bg-slate-100 dark:bg-zinc-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                                    +{team.users.length - 3}
                                </div>
                            )}
                        </div>
                        <Button variant="outline" className="rounded-full shadow-sm text-sm h-9 px-4">
                            <Plus className="w-4 h-4 mr-1" /> Invite
                        </Button>
                    </div>
                </div>

                <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col flex-1 h-full w-full overflow-hidden">
                    <div className="px-6 border-b border-sidebar-border/70">
                        <TabsList className="bg-transparent space-x-6 h-auto p-0 justify-start w-full">
                            {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 dark:text-slate-400 dark:data-[state=active]:text-slate-100"
                                >
                                    {TAB_LABELS[key]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <TabsContent value="overview" className="h-full m-0 p-6 flex flex-col">
                            <OverviewTab team={team} />
                        </TabsContent>
                        <TabsContent value="task" className="h-full m-0 p-0 flex flex-col">
                            <TugasTab team={team} item={item} />
                        </TabsContent>
                        <TabsContent value="chat" className="h-full m-0 p-6 flex flex-col">
                            <ChatTab team={team} />
                        </TabsContent>
                        <TabsContent value="announcement" className="h-full m-0 p-6 flex flex-col">
                            <PengumumanTab team={team} />
                        </TabsContent>
                        <TabsContent value="question" className="h-full m-0 p-6 flex flex-col">
                            <PertanyaanTab team={team} />
                        </TabsContent>
                        <TabsContent value="document" className="h-full m-0 p-6 flex flex-col">
                            <DokumenTab team={team} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </>
    );
}
