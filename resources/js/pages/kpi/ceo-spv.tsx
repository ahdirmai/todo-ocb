import CeoLayout from '@/layouts/ceo-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Building2, Users, CheckCircle2, Circle } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string | null;
    visit_date: string | null;
    due_date: string | null;
    is_verified: boolean;
    is_done: boolean;
    store: { id: string; name: string; branch_code: string } | null;
    creator: { id: number; name: string } | null;
    assignees: Array<{ id: number; name: string }>;
    column_name: string | null;
}

interface Member {
    id: number;
    name: string;
    email: string;
    job_position: { name: string } | null;
    tasks: Task[];
    total_tasks: number;
    completed_tasks: number;
}

interface Props {
    date: string;
    spvTeam: { id: string; name: string } | null;
    members: Member[];
    totalTasksToday: number;
    completedTasksToday: number;
}

function CompletionBar({ value }: { value: number }) {
    const color = value >= 80 ? 'bg-green-600' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
        </div>
    );
}

export default function CeoSpv({ date, spvTeam, members, totalTasksToday, completedTasksToday }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);

    const nextDate = new Date(date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);

    const navigate = (d: string) => {
        router.get('/kpi/ceo/spv', { date: d }, { preserveScroll: true });
    };

    const overallRate = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;

    return (
        <CeoLayout>
            <Head title="SPV Monitor - CEO" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="h-7 w-7" />
                            Monitor Tim SPV
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {spvTeam ? spvTeam.name : 'Tidak ada tim SPV yang dikonfigurasi'}
                        </p>
                    </div>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(prevDate.toISOString().split('T')[0])}
                                className="shrink-0"
                                aria-label="Hari sebelumnya"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden md:inline ml-1">Sebelumnya</span>
                            </Button>
                            <div className="text-center flex-1 min-w-0">
                                <p className="text-sm md:text-lg font-semibold truncate">
                                    {new Intl.DateTimeFormat('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    }).format(new Date(date + 'T00:00:00'))}
                                </p>
                                {isToday && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        Hari Ini
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(nextDate.toISOString().split('T')[0])}
                                disabled={isToday}
                                className="shrink-0"
                                aria-label="Hari berikutnya"
                            >
                                <span className="hidden md:inline mr-1">Berikutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {!spvTeam ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Tim SPV belum dikonfigurasi</p>
                            <p className="text-sm mt-1">
                                Tandai salah satu tim sebagai tim SPV di halaman manajemen tim
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Summary Stats */}
                        <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Anggota SPV
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{members.length}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Task</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{totalTasksToday}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        visit_date = tanggal ini
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Terverifikasi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600">{completedTasksToday}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={`text-3xl font-bold ${overallRate >= 80 ? 'text-green-600' : overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
                                    >
                                        {overallRate}%
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Overall Progress */}
                        {totalTasksToday > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>Progress Keseluruhan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {completedTasksToday} dari {totalTasksToday} task terverifikasi
                                            </span>
                                            <span className="font-semibold">{overallRate}%</span>
                                        </div>
                                        <CompletionBar value={overallRate} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Members + Tasks */}
                        <div className="space-y-4">
                            {members.map((member) => {
                                const rate =
                                    member.total_tasks > 0
                                        ? Math.round((member.completed_tasks / member.total_tasks) * 100)
                                        : 0;

                                return (
                                    <Card key={member.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <CardTitle className="text-base">{member.name}</CardTitle>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {member.job_position?.name ?? '-'} • {member.email}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-sm font-semibold">
                                                        {member.completed_tasks}/{member.total_tasks}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            rate >= 80
                                                                ? 'border-green-600 text-green-700'
                                                                : rate >= 50
                                                                  ? 'border-yellow-600 text-yellow-700'
                                                                  : 'border-red-600 text-red-700'
                                                        }
                                                    >
                                                        {rate}%
                                                    </Badge>
                                                </div>
                                            </div>
                                            {member.total_tasks > 0 && (
                                                <CompletionBar value={rate} />
                                            )}
                                        </CardHeader>

                                        {member.tasks.length === 0 ? (
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground text-center py-2">
                                                    Tidak ada task untuk tanggal ini
                                                </p>
                                            </CardContent>
                                        ) : (
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    {member.tasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="flex items-start gap-3 p-3 rounded-lg border"
                                                        >
                                                            <div className="mt-0.5 shrink-0">
                                                                {task.is_verified ? (
                                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                ) : (
                                                                    <Circle className="h-5 w-5 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm leading-tight">
                                                                    {task.title}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                                    {task.store && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            🏪 {task.store.branch_code} - {task.store.name}
                                                                        </span>
                                                                    )}
                                                                    {task.visit_date && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            📅{' '}
                                                                            {new Date(
                                                                                task.visit_date + 'T00:00:00',
                                                                            ).toLocaleDateString('id-ID', {
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                            })}
                                                                        </span>
                                                                    )}
                                                                    {task.column_name && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            📋 {task.column_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {task.is_verified ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="bg-green-50 text-green-700 text-xs"
                                                                        >
                                                                            Terverifikasi
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="bg-gray-50 text-gray-700 text-xs"
                                                                        >
                                                                            Belum Selesai
                                                                        </Badge>
                                                                    )}
                                                                    {task.assignees.length > 1 && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            👥{' '}
                                                                            {task.assignees
                                                                                .map((a) => a.name)
                                                                                .join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}

                            {members.length === 0 && (
                                <Card>
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        <p>Belum ada anggota di tim SPV</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </CeoLayout>
    );
}
