import { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './kanban-column';
import { TaskDetailModal } from './task-detail-modal';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as ColumnActions from '@/actions/App/Http/Controllers/KanbanColumnController';
import * as BoardActions from '@/actions/App/Http/Controllers/KanbanBoardController';

export function KanbanBoard({ kanban }: { kanban: any }) {
    const [columns, setColumns] = useState(kanban?.columns || []);
    const [addingColumn, setAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [saving, setSaving] = useState(false);

    // Task Detail Modal state
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const newColumns = kanban?.columns || [];
        setColumns(newColumns);
        
        if (selectedTask) {
            let updatedTask = null;
            for (const col of newColumns) {
                const found = col.tasks?.find((t: any) => t.id === selectedTask.id);
                if (found) {
                    updatedTask = found;
                    break;
                }
            }
            if (updatedTask) {
                setSelectedTask(updatedTask);
            }
        }
    }, [kanban]);

    const handleCardClick = (task: any) => {
        setSelectedTask(task);
        setModalOpen(true);
    };

    const handleTaskCreated = (task: any) => {
        setSelectedTask(task);
        setModalOpen(true);
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const sourceColIndex = columns.findIndex((c: any) => c.id === source.droppableId);
        const destColIndex = columns.findIndex((c: any) => c.id === destination.droppableId);

        if (sourceColIndex === -1 || destColIndex === -1) return;

        const newColumns = Array.from(columns) as any[];
        const sourceCol = newColumns[sourceColIndex];
        const destCol = newColumns[destColIndex];

        const sourceTasks = Array.from(sourceCol.tasks || []) as any[];
        const destTasks = source.droppableId === destination.droppableId
            ? sourceTasks
            : Array.from(destCol.tasks || []) as any[];

        const [movedTask] = sourceTasks.splice(source.index, 1);
        movedTask.kanban_column_id = destCol.id;
        destTasks.splice(destination.index, 0, movedTask);

        const updatedTasks = destTasks.map((t: any, idx: number) => ({ ...t, order_position: idx }));

        if (source.droppableId === destination.droppableId) {
            newColumns[sourceColIndex] = { ...sourceCol, tasks: updatedTasks };
        } else {
            const updatedSourceTasks = sourceTasks.map((t: any, idx: number) => ({ ...t, order_position: idx }));
            newColumns[sourceColIndex] = { ...sourceCol, tasks: updatedSourceTasks };
            newColumns[destColIndex] = { ...destCol, tasks: updatedTasks };
        }

        setColumns(newColumns);

        router.put(BoardActions.reorderTasks.url(), {
            tasks: updatedTasks.map((t: any) => ({
                id: t.id,
                kanban_column_id: t.kanban_column_id,
                order_position: t.order_position,
            })),
        }, { preserveScroll: true, preserveState: true });
    };

    const handleAddColumn = () => {
        if (!newColumnTitle.trim() || saving) return;
        setSaving(true);
        router.post(ColumnActions.store.url(kanban.id), {
            title: newColumnTitle.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewColumnTitle('');
                setAddingColumn(false);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    if (!kanban) return <div className="p-8 text-muted-foreground">No Kanban Board Found</div>;

    const columnColors = ['border-slate-300', 'border-blue-500', 'border-orange-500', 'border-emerald-500', 'border-purple-500', 'border-pink-500'];

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-1 h-full gap-6 overflow-x-auto p-6 pt-4 items-start">
                    {columns.map((column: any, idx: number) => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            colorClass={columnColors[idx % columnColors.length]}
                            teamId={kanban.team_id}
                            onCardClick={handleCardClick}
                            onTaskCreated={handleTaskCreated}
                        />
                    ))}

                    {/* Add Column */}
                    <div className="flex flex-col w-[280px] min-w-[280px]">
                        {addingColumn ? (
                            <div className="flex flex-col gap-2 p-3 rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Kolom</p>
                                <Input
                                    autoFocus
                                    value={newColumnTitle}
                                    onChange={(e) => setNewColumnTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddColumn();
                                        if (e.key === 'Escape') setAddingColumn(false);
                                    }}
                                    placeholder="Contoh: In Review"
                                    className="h-8 text-sm"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" className="h-7 text-xs" onClick={handleAddColumn} disabled={saving}>
                                        {saving ? 'Menyimpan...' : 'Tambah'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingColumn(false)}>
                                        Batal
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAddingColumn(true)}
                                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors w-full"
                            >
                                <Plus className="w-4 h-4" /> Tambah Kolom
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
                    setSelectedTask(null);
                }}
            />
        </>
    );
}
