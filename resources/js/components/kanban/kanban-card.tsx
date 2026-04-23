import { Draggable } from '@hello-pangea/dnd';
import { usePage } from '@inertiajs/react';
import { ArrowRightLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
    task: any;
    index: number;
    columns: any[];
    onClick: (task: any) => void;
    onMove: (taskId: string, destinationColumnId: string) => void;
}

export function KanbanCard({
    task,
    index,
    columns,
    onClick,
    onMove,
}: KanbanCardProps) {
    const { auth, team } = usePage<any>().props;

    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const isTaskCreator = task.creator_id === auth?.user?.id;
    const isTeamAdmin =
        team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role ===
        'admin';
    const isAssignee = task.assignees?.some(
        (assignee: any) => assignee.id === auth?.user?.id,
    );
    const canModify = Boolean(
        isGlobalAdmin || isTaskCreator || isTeamAdmin || isAssignee,
    );
    const moveTargets = columns.filter(
        (column: any) => column.id !== task.kanban_column_id,
    );

    const formatDate = (dateStr: string) => {
        if (!dateStr) {
            return '';
        }

        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Draggable
            draggableId={task.id.toString()}
            index={index}
            isDragDisabled={!canModify}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(task)}
                    className={`group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${
                        snapshot.isDragging
                            ? 'z-50 scale-105 rotate-1 cursor-grabbing shadow-lg ring-2 ring-primary/20'
                            : ''
                    }`}
                >
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {task.tags.map((tag: any) => (
                                <Badge
                                    key={tag.id}
                                    style={{ backgroundColor: tag.color }}
                                    className="hover:bg-opacity-90 rounded-full border-none px-2.5 py-0 text-[10px] font-semibold text-white"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Title */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="leading-tight font-bold text-slate-900 dark:text-slate-100">
                                {task.title}
                            </h3>
                        </div>

                        {canModify && moveTargets.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Pindahkan task"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 focus:ring-2 focus:ring-amber-300/60 focus:outline-none dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
                                    >
                                        <ArrowRightLeft className="h-3.5 w-3.5" />
                                        Move
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    onClick={(event) => event.stopPropagation()}
                                    className="w-56 rounded-xl border-slate-200 p-1.5 shadow-xl dark:border-zinc-800"
                                >
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="rounded-lg px-2.5 py-2 font-medium text-slate-700 dark:text-slate-200">
                                            <ArrowRightLeft className="h-4 w-4" />
                                            Pindahkan ke
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56 rounded-xl border-slate-200 p-1.5 shadow-xl dark:border-zinc-800">
                                            {moveTargets.map((column: any) => (
                                                <DropdownMenuItem
                                                    key={column.id}
                                                    onSelect={() =>
                                                        onMove(
                                                            task.id,
                                                            column.id,
                                                        )
                                                    }
                                                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
                                                >
                                                    {column.title}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="mb-4 flex flex-col gap-1 border-l-2 border-slate-200 pl-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        {task.created_at && (
                            <span className="flex items-center gap-1">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                    Dibuat:
                                </span>{' '}
                                {formatDate(task.created_at)}
                            </span>
                        )}
                        {task.updated_at &&
                            task.updated_at !== task.created_at && (
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                                        Terakhir diedit:
                                    </span>{' '}
                                    {formatDate(task.updated_at)}
                                </span>
                            )}
                    </div>

                    {/* Footer: Avatars */}
                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {task.assignees?.slice(0, 4).map((a: any) => (
                                <Avatar
                                    key={a.id}
                                    className="h-6 w-6 border-2 border-white bg-slate-100 dark:border-zinc-900"
                                >
                                    <AvatarImage
                                        src={
                                            a.avatar_url ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`
                                        }
                                    />
                                    <AvatarFallback className="text-[10px] text-slate-600">
                                        {a.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {task.assignees?.length > 4 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-semibold text-slate-600 dark:border-zinc-900 dark:bg-zinc-800 dark:text-slate-400">
                                    +{task.assignees.length - 4}
                                </div>
                            )}
                            {(!task.assignees ||
                                task.assignees.length === 0) && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-white bg-slate-100 dark:border-zinc-900 dark:bg-zinc-800">
                                    <span className="text-[10px] text-slate-400">
                                        -
                                    </span>
                                </div>
                            )}
                        </div>

                        {task.due_date && (
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                {new Date(task.due_date).toLocaleDateString(
                                    'id-ID',
                                    { day: 'numeric', month: 'short' },
                                )}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}
