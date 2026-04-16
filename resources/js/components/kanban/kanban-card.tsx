import { Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePage } from '@inertiajs/react';

interface KanbanCardProps {
    task: any;
    index: number;
    onClick: (task: any) => void;
}

export function KanbanCard({ task, index, onClick }: KanbanCardProps) {
    const { auth, team } = usePage<any>().props;

    const isGlobalAdmin = auth?.roles?.some((r: string) => ['superadmin', 'admin'].includes(r));
    const isTaskCreator = task.creator_id === auth?.user?.id;
    const isTeamAdmin = team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role === 'admin';
    
    const canModify = Boolean(isGlobalAdmin || isTaskCreator || isTeamAdmin);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Draggable draggableId={task.id.toString()} index={index} isDragDisabled={!canModify}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(task)}
                    className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                        snapshot.isDragging ? 'shadow-lg rotate-1 scale-105 z-50 ring-2 ring-primary/20 cursor-grabbing' : ''
                    }`}
                >
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div className="flex mb-3 gap-1.5 flex-wrap">
                            {task.tags.map((tag: any) => (
                                <Badge 
                                    key={tag.id}
                                    style={{ backgroundColor: tag.color }} 
                                    className="text-white hover:bg-opacity-90 border-none rounded-full px-2.5 py-0 text-[10px] font-semibold"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Title */}
                    <h3 className="text-slate-900 dark:text-slate-100 font-bold leading-tight mb-3">
                        {task.title}
                    </h3>

                    {/* Dates */}
                    <div className="flex flex-col gap-1 mb-4 text-[10px] text-slate-400 dark:text-slate-500 border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                        {task.created_at && (
                            <span className="flex items-center gap-1"><span className="font-semibold text-slate-500 dark:text-slate-400">Dibuat:</span> {formatDate(task.created_at)}</span>
                        )}
                        {task.updated_at && task.updated_at !== task.created_at && (
                            <span className="flex items-center gap-1"><span className="font-semibold text-slate-500 dark:text-slate-400">Terakhir diedit:</span> {formatDate(task.updated_at)}</span>
                        )}
                    </div>

                    {/* Footer: Avatars */}
                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {/* Show assigned users from comments/assignees if available, else placeholder */}
                            {task.comments?.slice(0, 2).map((c: any, i: number) => (
                                <Avatar key={c.id ?? i} className="w-6 h-6 border-2 border-white dark:border-zinc-900">
                                    <AvatarImage src={`https://i.pravatar.cc/100?img=${(c.user_id ?? i) + 5}`} />
                                    <AvatarFallback className="text-[10px]">{c.user?.name?.charAt(0) ?? '?'}</AvatarFallback>
                                </Avatar>
                            ))}
                            {(!task.comments || task.comments.length === 0) && (
                                <Avatar className="w-6 h-6 border-2 border-white dark:border-zinc-900">
                                    <AvatarImage src="https://i.pravatar.cc/100?img=11" />
                                    <AvatarFallback className="text-[10px]">U</AvatarFallback>
                                </Avatar>
                            )}
                        </div>

                        {task.due_date && (
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}
