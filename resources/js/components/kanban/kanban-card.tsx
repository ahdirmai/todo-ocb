import { Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const TAG_COLORS: Record<string, string> = {
    Design:   'bg-blue-500',
    Research: 'bg-purple-500',
    Dev:      'bg-amber-400',
    Content:  'bg-pink-500',
    Other:    'bg-slate-400',
};

interface KanbanCardProps {
    task: any;
    index: number;
    onClick: (task: any) => void;
}

export function KanbanCard({ task, index, onClick }: KanbanCardProps) {
    const label = task.labels?.[0];
    const tagText = label?.name || 'Other';
    const tagColor = TAG_COLORS[tagText] ?? 'bg-slate-400';

    return (
        <Draggable draggableId={task.id.toString()} index={index}>
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
                    {/* Tag */}
                    <div className="flex mb-3">
                        <Badge className={`${tagColor} text-white hover:bg-opacity-90 border-none rounded-full px-3 py-0.5 text-xs font-semibold`}>
                            {tagText}
                        </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-slate-900 dark:text-slate-100 font-bold leading-tight mb-4">
                        {task.title}
                    </h3>

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
