import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { KanbanCard } from './kanban-card';
import { MoreHorizontal, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { router } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import * as ColumnActions from '@/actions/App/Http/Controllers/KanbanColumnController';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';

interface Props {
    column: any;
    colorClass: string;
    teamId: string;
    onCardClick: (task: any) => void;
    onTaskCreated: (task: any) => void;
}

export function KanbanColumn({ column, colorClass, teamId, onCardClick, onTaskCreated }: Props) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(column.title);
    const [addingTask, setAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [savingTask, setSavingTask] = useState(false);

    const handleRenameColumn = () => {
        if (!title.trim() || title === column.title) {
            setEditing(false);
            setTitle(column.title);
            return;
        }
        router.put(ColumnActions.update.url(column.id), { title: title.trim() }, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
            onError: () => { setTitle(column.title); setEditing(false); },
        });
    };

    const handleDeleteColumn = () => {
        if (!confirm(`Hapus kolom "${column.title}"? Semua task di dalamnya akan ikut terhapus.`)) return;
        router.delete(ColumnActions.destroy.url(column.id), { preserveScroll: true });
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim() || savingTask) return;
        setSavingTask(true);

        // Optimistic stub task to show in modal immediately after server responds
        router.post(TaskActions.store.url(), {
            kanban_column_id: column.id,
            team_id: teamId,
            title: newTaskTitle.trim(),
        }, {
            preserveScroll: true,
            preserveState: false, // let Inertia refresh props.team so new task appears
            onSuccess: (page) => {
                // Find the newly created task. It will be the last one in this column.
                const updatedKanban = (page.props as any).team?.kanbans?.[0];
                const updatedColumn = updatedKanban?.columns?.find((c: any) => c.id === column.id);
                const latestTasks = updatedColumn?.tasks ?? [];
                const newTask = latestTasks[latestTasks.length - 1];

                setSavingTask(false);
                setNewTaskTitle('');
                setAddingTask(false);

                if (newTask) {
                    onTaskCreated(newTask);
                }
            },
            onError: () => setSavingTask(false),
        });
    };

    return (
        <div className="flex flex-col w-[320px] min-w-[320px] h-full">
            {/* Column Header */}
            <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${colorClass}`}>
                <div className="flex items-center gap-2 flex-1">
                    {editing ? (
                        <div className="flex items-center gap-1 flex-1">
                            <Input
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameColumn();
                                    if (e.key === 'Escape') { setTitle(column.title); setEditing(false); }
                                }}
                                className="h-6 text-xs font-bold uppercase tracking-wider py-0 px-1"
                            />
                            <button onClick={handleRenameColumn} className="text-emerald-500 hover:text-emerald-600">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setTitle(column.title); setEditing(false); }} className="text-red-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                {column.title}
                            </h2>
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">
                                {column.tasks?.length || 0}
                            </span>
                        </>
                    )}
                </div>

                {!editing && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-600 ml-2">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                                <Pencil className="w-4 h-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleDeleteColumn}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus Kolom
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Tasks Droppable */}
            <Droppable droppableId={column.id.toString()} type="task">
                {(provided, snapshot) => (
                    <ScrollArea className="flex-1 h-full rounded-md pr-3 -mr-3 pb-4">
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[200px] flex flex-col gap-4 rounded-lg transition-colors ${
                                snapshot.isDraggingOver ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''
                            }`}
                        >
                            {column.tasks?.map((task: any, index: number) => (
                                <KanbanCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onClick={onCardClick}
                                />
                            ))}
                            {provided.placeholder}

                            {/* Add Task Inline */}
                            {addingTask ? (
                                <div className="flex flex-col gap-2 p-3 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900">
                                    <Input
                                        autoFocus
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddTask();
                                            if (e.key === 'Escape') setAddingTask(false);
                                        }}
                                        placeholder="Judul task baru..."
                                        className="h-8 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddTask}
                                            disabled={savingTask}
                                            className="flex-1 text-xs py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {savingTask ? 'Menyimpan...' : 'Tambah'}
                                        </button>
                                        <button
                                            onClick={() => setAddingTask(false)}
                                            className="flex-1 text-xs py-1 rounded-md border border-sidebar-border hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAddingTask(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Card
                                </button>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </Droppable>
        </div>
    );
}
