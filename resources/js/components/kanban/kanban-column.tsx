import { Droppable } from '@hello-pangea/dnd';
import { router, usePage } from '@inertiajs/react';
import { MoreHorizontal, Pencil, Trash2, Check, X, Plus, CircleCheckBig } from 'lucide-react';
import { useState, useRef } from 'react';
import * as ColumnActions from '@/actions/App/Http/Controllers/KanbanColumnController';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './kanban-card';

interface Props {
    column: any;
    columns: any[];
    colorClass: string;
    teamId: string;
    onCardClick: (task: any) => void;
    onMoveTask: (taskId: string, destinationColumnId: string) => void;
    onTaskCreated: (task: any) => void;
}

export function KanbanColumn({
    column,
    columns,
    colorClass,
    teamId,
    onCardClick,
    onMoveTask,
    onTaskCreated,
}: Props) {
    const { uploads } = usePage().props as any;
    const maxFileLabel = `${((uploads?.documents?.maxFileKb ?? 20480) / 1024).toFixed(1)} MB`;
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(column.title);
    const [addingTask, setAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [savingTask, setSavingTask] = useState(false);
    const [newTaskAttachments, setNewTaskAttachments] = useState<File[]>([]);
    const taskFileInputRef = useRef<HTMLInputElement>(null);

    const handleToggleDoneColumn = () => {
        router.put(
            ColumnActions.update.url(column.id),
            { is_done: !column.is_done },
            {
                preserveScroll: true,
            },
        );
    };

    const handleRenameColumn = () => {
        if (!title.trim() || title === column.title) {
            setEditing(false);
            setTitle(column.title);

            return;
        }

        router.put(
            ColumnActions.update.url(column.id),
            { title: title.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onError: () => {
                    setTitle(column.title);
                    setEditing(false);
                },
            },
        );
    };

    const handleDeleteColumn = () => {
        if (
            !confirm(
                `Hapus kolom "${column.title}"? Semua task di dalamnya akan ikut terhapus.`,
            )
        ) {
            return;
        }

        router.delete(ColumnActions.destroy.url(column.id), {
            preserveScroll: true,
        });
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim() || savingTask) {
            return;
        }

        setSavingTask(true);

        const formData = new FormData();
        formData.append('kanban_column_id', column.id);
        formData.append('team_id', teamId);
        formData.append('title', newTaskTitle.trim());

        newTaskAttachments.forEach((file, index) => {
            formData.append(`attachments[${index}]`, file);
        });

        router.post(TaskActions.store.url(), formData, {
            preserveScroll: true,
            preserveState: false, // let Inertia refresh props.team so new task appears
            onSuccess: (page) => {
                const updatedKanban = (page.props as any).team?.kanbans?.[0];
                const updatedColumn = updatedKanban?.columns?.find(
                    (c: any) => c.id === column.id,
                );
                const latestTasks = updatedColumn?.tasks ?? [];
                const newTask = latestTasks[latestTasks.length - 1];

                setSavingTask(false);
                setNewTaskTitle('');
                setNewTaskAttachments([]);
                setAddingTask(false);

                if (taskFileInputRef.current) {
                    taskFileInputRef.current.value = '';
                }

                if (newTask) {
                    onTaskCreated(newTask);
                }
            },
            onError: () => setSavingTask(false),
        });
    };

    return (
        <div className="flex h-full w-[320px] min-w-[320px] flex-col">
            {/* Column Header */}
            <div
                className={`mb-4 flex items-center justify-between border-b-2 pb-2 ${colorClass}`}
            >
                <div className="flex flex-1 items-center gap-2">
                    {editing ? (
                        <div className="flex flex-1 items-center gap-1">
                            <Input
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleRenameColumn();
                                    }

                                    if (e.key === 'Escape') {
                                        setTitle(column.title);
                                        setEditing(false);
                                    }
                                }}
                                className="h-6 px-1 py-0 text-xs font-bold tracking-wider uppercase"
                            />
                            <button
                                onClick={handleRenameColumn}
                                className="text-emerald-500 hover:text-emerald-600"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setTitle(column.title);
                                    setEditing(false);
                                }}
                                className="text-red-400 hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                                {column.title}
                            </h2>
                            {column.is_done && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                    <CircleCheckBig className="h-3 w-3" />
                                    Done
                                </span>
                            )}
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                                {column.tasks?.length || 0}
                            </span>
                        </>
                    )}
                </div>

                {!editing && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="ml-2 text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={handleToggleDoneColumn}>
                                <CircleCheckBig className="mr-2 h-4 w-4" />
                                {column.is_done
                                    ? 'Hapus status Done'
                                    : 'Tandai Done'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleDeleteColumn}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus Kolom
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Tasks Droppable */}
            <Droppable droppableId={column.id.toString()} type="task">
                {(provided, snapshot) => (
                    <ScrollArea className="-mr-3 h-full flex-1 rounded-md pr-3 pb-4">
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex min-h-[200px] flex-col gap-4 rounded-lg transition-colors ${
                                snapshot.isDraggingOver
                                    ? 'bg-slate-50/50 dark:bg-slate-900/50'
                                    : ''
                            }`}
                        >
                            {column.tasks?.map((task: any, index: number) => (
                                <KanbanCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    columns={columns}
                                    onClick={onCardClick}
                                    onMove={onMoveTask}
                                />
                            ))}
                            {provided.placeholder}

                            {/* Add Task Inline */}
                            {addingTask ? (
                                <div className="flex flex-col gap-2 rounded-xl border border-sidebar-border/70 bg-white p-3 dark:bg-zinc-900">
                                    <Input
                                        autoFocus
                                        value={newTaskTitle}
                                        onChange={(e) =>
                                            setNewTaskTitle(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddTask();
                                            }

                                            if (e.key === 'Escape') {
                                                setAddingTask(false);
                                            }
                                        }}
                                        placeholder="Judul task baru..."
                                        className="h-8 text-sm"
                                    />

                                    {newTaskAttachments.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {newTaskAttachments.map((f, i) => (
                                                <span
                                                    key={i}
                                                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-zinc-800"
                                                >
                                                    {f.name}
                                                    <button
                                                        onClick={() =>
                                                            setNewTaskAttachments(
                                                                newTaskAttachments.filter(
                                                                    (_, idx) =>
                                                                        idx !==
                                                                        i,
                                                                ),
                                                            )
                                                        }
                                                        className="ml-1 text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            ref={taskFileInputRef}
                                            onChange={(e) => {
                                                if (e.target.files?.length) {
                                                    setNewTaskAttachments([
                                                        ...newTaskAttachments,
                                                        ...Array.from(
                                                            e.target.files,
                                                        ),
                                                    ]);
                                                }
                                            }}
                                        />
                                        <button
                                            title="Lampirkan File"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                taskFileInputRef.current?.click();
                                            }}
                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={handleAddTask}
                                            disabled={savingTask}
                                            className="flex-1 rounded-md bg-primary py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {savingTask
                                                ? 'Menyimpan...'
                                                : 'Tambah'}
                                        </button>
                                        <button
                                            onClick={() => setAddingTask(false)}
                                            className="flex-1 rounded-md border border-sidebar-border py-1.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Maks. {maxFileLabel} per file.
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAddingTask(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-transparent py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                                >
                                    <Plus className="h-4 w-4" /> Add Card
                                </button>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </Droppable>
        </div>
    );
}
