import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
    team: any;
    taskMonth: string | null;
}

export function TugasTab({ team, taskMonth }: Props) {
    const kanban = team.kanbans?.[0];

    const applyMonth = (value: string | null) => {
        const url = new URL(window.location.href);
        if (value) {
            url.searchParams.set('month', value);
        } else {
            url.searchParams.delete('month');
        }
        router.visit(url.pathname + url.search, { preserveScroll: true });
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-sidebar-border/70 px-6 py-3">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Filter Bulan:
                </label>
                <Input
                    type="month"
                    value={taskMonth ?? ''}
                    onChange={(e) => applyMonth(e.target.value || null)}
                    className="h-8 w-44 text-sm"
                />
                {taskMonth && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => applyMonth(null)}
                    >
                        <X className="h-3 w-3" /> Reset
                    </Button>
                )}
            </div>
            {kanban ? (
                <KanbanBoard kanban={kanban} />
            ) : (
                <div className="m-6 flex h-full items-center justify-center rounded-xl border-2 border-dashed border-sidebar-border/70 text-muted-foreground">
                    Belum ada papan Kanban untuk tim ini.
                </div>
            )}
        </div>
    );
}
