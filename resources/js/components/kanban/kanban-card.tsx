import { Draggable } from '@hello-pangea/dnd';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
    task: any;
    index: number;
    onClick: (task: any) => void;
}

export function KanbanCard({ task, index, onClick }: KanbanCardProps) {
    const { auth, team } = usePage<any>().props;

    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const isTaskCreator = task.creator_id === auth?.user?.id;
    const isTeamAdmin =
        team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role ===
        'admin';
    const isAssignee = task.assignees?.some(
        (a: any) => a.id === auth?.user?.id,
    );

    const canModify = Boolean(
        isGlobalAdmin || isTaskCreator || isTeamAdmin || isAssignee,
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
                    <h3 className="mb-3 leading-tight font-bold text-slate-900 dark:text-slate-100">
                        {task.title}
                    </h3>

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
