import { KanbanBoard } from '@/components/kanban/kanban-board';

interface Props {
    team: any;
    item?: string;
}

export function TugasTab({ team, item }: Props) {
    const kanban = team.kanbans?.[0];

    if (!kanban) {
        return (
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-sidebar-border/70 text-muted-foreground">
                Belum ada papan Kanban untuk tim ini.
            </div>
        );
    }

    return <KanbanBoard kanban={kanban} />;
}
