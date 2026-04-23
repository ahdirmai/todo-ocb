import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext } from '@hello-pangea/dnd';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as BoardActions from '@/actions/App/Http/Controllers/KanbanBoardController';
import * as ColumnActions from '@/actions/App/Http/Controllers/KanbanColumnController';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanbanColumn } from './kanban-column';
import { TaskDetailModal } from './task-detail-modal';

export function KanbanBoard({ kanban }: { kanban: any }) {
    const [optimisticColumns, setOptimisticColumns] = useState<any[] | null>(
        null,
    );
    const [addingColumn, setAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [saving, setSaving] = useState(false);

    // Task Detail Modal state
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        return new URLSearchParams(window.location.search).get('taskId');
    });
    const [modalOpen, setModalOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return new URLSearchParams(window.location.search).has('taskId');
    });
    const columns = useMemo(
        () => optimisticColumns ?? kanban?.columns ?? [],
        [kanban?.columns, optimisticColumns],
    );
    const selectedTask = useMemo(() => {
        if (!selectedTaskId) {
            return null;
        }

        for (const col of columns) {
            const found = col.tasks?.find(
                (task: any) => task.id === selectedTaskId,
            );

            if (found) {
                return found;
            }
        }

        return null;
    }, [columns, selectedTaskId]);

    const handleCardClick = (task: any) => {
        setSelectedTaskId(task.id);
        setModalOpen(true);
    };

    const handleTaskCreated = (task: any) => {
        setSelectedTaskId(task.id);
        setModalOpen(true);
    };

    const moveTaskToColumn = (taskId: string, destinationColumnId: string) => {
        const sourceColumn = columns.find((column: any) =>
            column.tasks?.some((task: any) => task.id === taskId),
        );
        const destinationColumn = columns.find(
            (column: any) => column.id === destinationColumnId,
        );

        if (!sourceColumn || !destinationColumn) {
            return;
        }

        const task = sourceColumn.tasks?.find(
            (item: any) => item.id === taskId,
        );

        if (!task || sourceColumn.id === destinationColumnId) {
            return;
        }

        const newColumns = columns.map((column: any) => {
            if (column.id === sourceColumn.id) {
                return {
                    ...column,
                    tasks: (column.tasks ?? [])
                        .filter((item: any) => item.id !== taskId)
                        .map((item: any, index: number) => ({
                            ...item,
                            order_position: index,
                        })),
                };
            }

            if (column.id === destinationColumnId) {
                const updatedTasks = [
                    ...(column.tasks ?? []),
                    {
                        ...task,
                        kanban_column_id: destinationColumnId,
                    },
                ].map((item: any, index: number) => ({
                    ...item,
                    order_position: index,
                }));

                return {
                    ...column,
                    tasks: updatedTasks,
                };
            }

            return column;
        });

        setOptimisticColumns(newColumns);

        router.put(
            TaskActions.update.url(taskId),
            {
                kanban_column_id: destinationColumnId,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setOptimisticColumns(null),
                onError: () => setOptimisticColumns(null),
            },
        );
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source } = result;

        if (!destination) {
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const sourceColIndex = columns.findIndex(
            (c: any) => c.id === source.droppableId,
        );
        const destColIndex = columns.findIndex(
            (c: any) => c.id === destination.droppableId,
        );

        if (sourceColIndex === -1 || destColIndex === -1) {
            return;
        }

        const newColumns = Array.from(columns) as any[];
        const sourceCol = newColumns[sourceColIndex];
        const destCol = newColumns[destColIndex];

        const sourceTasks = Array.from(sourceCol.tasks || []) as any[];
        const destTasks =
            source.droppableId === destination.droppableId
                ? sourceTasks
                : (Array.from(destCol.tasks || []) as any[]);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        movedTask.kanban_column_id = destCol.id;
        destTasks.splice(destination.index, 0, movedTask);

        const updatedTasks = destTasks.map((t: any, idx: number) => ({
            ...t,
            order_position: idx,
        }));

        if (source.droppableId === destination.droppableId) {
            newColumns[sourceColIndex] = { ...sourceCol, tasks: updatedTasks };
        } else {
            const updatedSourceTasks = sourceTasks.map(
                (t: any, idx: number) => ({ ...t, order_position: idx }),
            );
            newColumns[sourceColIndex] = {
                ...sourceCol,
                tasks: updatedSourceTasks,
            };
            newColumns[destColIndex] = { ...destCol, tasks: updatedTasks };
        }

        setOptimisticColumns(newColumns);

        router.put(
            BoardActions.reorderTasks.url(),
            {
                tasks: updatedTasks.map((t: any) => ({
                    id: t.id,
                    kanban_column_id: t.kanban_column_id,
                    order_position: t.order_position,
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setOptimisticColumns(null),
                onError: () => setOptimisticColumns(null),
            },
        );
    };

    const handleAddColumn = () => {
        if (!newColumnTitle.trim() || saving) {
            return;
        }

        setSaving(true);
        router.post(
            ColumnActions.store.url(kanban.id),
            {
                title: newColumnTitle.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewColumnTitle('');
                    setAddingColumn(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    };

    if (!kanban) {
        return (
            <div className="p-8 text-muted-foreground">
                No Kanban Board Found
            </div>
        );
    }

    const columnColors = [
        'border-slate-300',
        'border-blue-500',
        'border-orange-500',
        'border-emerald-500',
        'border-purple-500',
        'border-pink-500',
    ];

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full flex-1 items-start gap-6 overflow-x-auto p-6 pt-4">
                    {columns.map((column: any, idx: number) => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            columns={columns}
                            colorClass={columnColors[idx % columnColors.length]}
                            teamId={kanban.team_id}
                            onCardClick={handleCardClick}
                            onMoveTask={moveTaskToColumn}
                            onTaskCreated={handleTaskCreated}
                        />
                    ))}

                    {/* Add Column */}
                    <div className="flex w-[280px] min-w-[280px] flex-col">
                        {addingColumn ? (
                            <div className="flex flex-col gap-2 rounded-xl border border-sidebar-border/70 bg-white p-3 dark:bg-zinc-900">
                                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                    Nama Kolom
                                </p>
                                <Input
                                    autoFocus
                                    value={newColumnTitle}
                                    onChange={(e) =>
                                        setNewColumnTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddColumn();
                                        }

                                        if (e.key === 'Escape') {
                                            setAddingColumn(false);
                                        }
                                    }}
                                    placeholder="Contoh: In Review"
                                    className="h-8 text-sm"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleAddColumn}
                                        disabled={saving}
                                    >
                                        {saving ? 'Menyimpan...' : 'Tambah'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => setAddingColumn(false)}
                                    >
                                        Batal
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAddingColumn(true)}
                                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                            >
                                <Plus className="h-4 w-4" /> Tambah Kolom
                            </button>
                        )}
                    </div>
                </div>
            </DragDropContext>

            {/* Centralized Task Detail Modal */}
            <TaskDetailModal
                task={selectedTask}
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedTaskId(null);
                }}
            />
        </>
    );
}
