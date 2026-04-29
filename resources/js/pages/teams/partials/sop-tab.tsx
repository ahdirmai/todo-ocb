import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { parse as parseSop } from '@/routes/teams/sop';
import { update as updateSopStep } from '@/routes/teams/sop/steps';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type SopStep = {
    id: string;
    sequence_order: number;
    name: string;
    action: string;
    keywords: string[];
    required_evidence: 'comment' | 'media' | 'both';
    priority: 'high' | 'medium' | 'low';
    weight: number;
    min_comment: number;
    min_media: number;
    expected_column: string | null;
    kanban_column_id: string | null;
    score_kurang: number;
    score_cukup: number;
    score_sangat_baik: number;
    is_mandatory: boolean;
};

export function SopTab({ team }: { team: { slug: string; name: string } }) {
    const { sopData, errors } = usePage<{
        sopData: {
            document: {
                id: string;
                name: string;
                type: string;
                content_source: string;
                updated_at: string | null;
                steps_count: number;
                parse_status: string | null;
                parse_platform: string | null;
                parse_error: string | null;
                parse_queued_at: string | null;
                parse_started_at: string | null;
                parse_completed_at: string | null;
            } | null;
            steps: SopStep[];
            kanban_columns: { id: string; title: string; kanban_name: string }[];
            platforms: { value: string; label: string }[];
            default_platform: string | null;
        };
        errors: Record<string, string | undefined>;
    }>().props;

    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [draftSteps, setDraftSteps] = useState<Record<string, SopStep>>({});
    const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
    
    const platform = selectedPlatform ?? sopData.default_platform ?? '';
    
    const steps = [...sopData.steps]
        .map((step) => draftSteps[step.id] ?? step)
        .sort((a, b) => a.sequence_order - b.sequence_order);

    const assignedColumnIds = steps
        .map((s) => s.kanban_column_id)
        .filter((id): id is string => id !== null);

    const hasBeenParsed = sopData.document?.parse_status === 'completed' || steps.length > 0;

    const handleParse = () => {
        if (!sopData.document) {
            toast.error('Belum ada dokumen SOP aktif untuk tim ini.');
            return;
        }

        if (!platform) {
            toast.error('Pilih platform AI terlebih dahulu.');
            return;
        }

        router.post(
            parseSop.url(team),
            { document_id: sopData.document.id, platform },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Parse SOP sudah masuk queue.'),
                onError: () => toast.error(errors.sop_parse ?? 'Gagal memproses SOP.'),
            },
        );
    };

    const handleStepChange = (
        stepId: string,
        field: keyof SopStep,
        value: string | number | boolean | string[] | null,
    ) => {
        setDraftSteps((current) => {
            const baseStep = current[stepId] ?? sopData.steps.find((step) => step.id === stepId);
            if (!baseStep) return current;

            return {
                ...current,
                [stepId]: { ...baseStep, [field]: value },
            };
        });
    };

    const saveStep = (step: SopStep) => {
        router.patch(
            updateSopStep.url({ team, documentSopStep: step.id }),
            {
                name: step.name,
                action: step.action,
                keywords: step.keywords,
                required_evidence: step.required_evidence,
                priority: step.priority,
                weight: step.weight,
                min_comment: step.min_comment,
                min_media: step.min_media,
                kanban_column_id: step.kanban_column_id,
                score_kurang: step.score_kurang,
                score_cukup: step.score_cukup,
                score_sangat_baik: step.score_sangat_baik,
                is_mandatory: step.is_mandatory,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDraftSteps((current) => {
                        const nextDrafts = { ...current };
                        delete nextDrafts[step.id];
                        return nextDrafts;
                    });
                    toast.success(`Step ${step.sequence_order} diperbarui.`);
                },
                onError: () => toast.error('Gagal memperbarui step SOP.'),
            },
        );
    };

    const handleAddStep = () => {
        router.post(
            `/teams/${team.slug}/sop/steps`,
            { name: 'Step Baru' },
            { preserveScroll: true, onSuccess: () => toast.success('Step ditambahkan') }
        );
    };

    const handleDeleteStep = (stepId: string) => {
        if (!confirm('Yakin ingin menghapus step ini?')) return;
        router.delete(`/teams/${team.slug}/sop/steps/${stepId}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Step dihapus'),
        });
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        const newSteps = Array.from(steps);
        const [reorderedItem] = newSteps.splice(sourceIndex, 1);
        newSteps.splice(destinationIndex, 0, reorderedItem);

        const updatedSteps = newSteps.map((step, index) => ({
            ...step,
            sequence_order: index + 1,
        }));

        const newDrafts = { ...draftSteps };
        updatedSteps.forEach((s) => {
            if (s.sequence_order !== (sopData.steps.find((orig) => orig.id === s.id)?.sequence_order)) {
                newDrafts[s.id] = s;
            }
        });
        setDraftSteps(newDrafts);

        router.put(
            `/teams/${team.slug}/sop/steps/reorder`,
            {
                steps: updatedSteps.map((s) => ({
                    id: s.id,
                    sequence_order: s.sequence_order,
                })),
            },
            { preserveScroll: true, onSuccess: () => toast.success('Urutan diperbarui') },
        );
    };

    const toggleAdvanced = (stepId: string) => {
        setExpandedSteps((prev) =>
            prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
        );
    };

    return (
        <div className="flex h-full flex-col gap-6 overflow-y-auto pr-1">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            SOP Team
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {sopData.document?.name ?? 'Belum ada SOP aktif'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            AI hanya membaca dokumen SOP. Mapping ke kolom
                            kanban dan scoring step diatur manual oleh admin.
                        </p>
                        {sopData.document?.parse_status && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Status parse: <span className="font-semibold capitalize">{sopData.document.parse_status}</span>
                                {sopData.document.parse_platform && ` · ${sopData.document.parse_platform}`}
                            </p>
                        )}
                        {sopData.document?.parse_error && (
                            <p className="text-sm text-red-600 dark:text-red-300">
                                Error terakhir: {sopData.document.parse_error}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[220px_auto]">
                        <div className="space-y-2">
                            <Label>Platform AI</Label>
                            <Select value={platform} onValueChange={setSelectedPlatform} disabled={hasBeenParsed}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih AI" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sopData.platforms.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            className="self-end"
                            onClick={handleParse}
                            disabled={!sopData.document || !platform || hasBeenParsed}
                        >
                            Parse SOP Jadi Step
                        </Button>
                    </div>
                </div>

                {errors.sop_parse && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                        {errors.sop_parse}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daftar Step SOP</h3>
                    {sopData.document && (
                        <Button size="sm" variant="outline" onClick={handleAddStep} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tambah Step
                        </Button>
                    )}
                </div>

                {steps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-slate-500 dark:border-zinc-700 dark:text-slate-400">
                        Belum ada SOP Step. Parse dokumen SOP aktif untuk mulai membuat struktur step.
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="sop-steps">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                    {steps.map((step, index) => (
                                        <Draggable key={step.id} draggableId={step.id} index={index}>
                                            {(provided, snapshot) => (
                                                <article
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-950 ${snapshot.isDragging ? 'shadow-md ring-2 ring-blue-500/50' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="mt-1 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-slate-500 dark:hover:text-slate-300"
                                                        >
                                                            <GripVertical className="h-5 w-5" />
                                                        </div>

                                                        <div className="flex-1 space-y-4">
                                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                                <div className="flex-1 space-y-2 min-w-[200px]">
                                                                    <Label className="text-xs text-slate-500">Step {step.sequence_order}</Label>
                                                                    <Input
                                                                        value={step.name}
                                                                        onChange={(e) => handleStepChange(step.id, 'name', e.target.value)}
                                                                        className="font-medium"
                                                                    />
                                                                </div>

                                                                <div className="w-[260px] space-y-2">
                                                                    <Label className="text-xs text-slate-500">Kolom Kanban Terkait</Label>
                                                                    <Select
                                                                        value={step.kanban_column_id ?? 'none'}
                                                                        onValueChange={(value) => handleStepChange(step.id, 'kanban_column_id', value === 'none' ? null : value)}
                                                                    >
                                                                        <SelectTrigger className="h-9">
                                                                            <SelectValue placeholder="Pilih kolom kanban" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">Belum dihubungkan</SelectItem>
                                                                            {sopData.kanban_columns
                                                                                .filter((column) => column.id === step.kanban_column_id || !assignedColumnIds.includes(column.id))
                                                                                .map((column) => (
                                                                                    <SelectItem key={column.id} value={column.id}>
                                                                                        {column.title}
                                                                                    </SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                
                                                                <div className="flex items-end pt-6">
                                                                    <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDeleteStep(step.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {expandedSteps.includes(step.id) && (
                                                                <div className="animate-in slide-in-from-top-2 pt-4 border-t border-slate-100 dark:border-zinc-800/50 mt-4 space-y-4">
                                                                    <div className="grid gap-4 lg:grid-cols-2">
                                                                        <div className="space-y-2 lg:col-span-2">
                                                                            <Label>Action / Deskripsi</Label>
                                                                            <Textarea
                                                                                value={step.action}
                                                                                onChange={(e) => handleStepChange(step.id, 'action', e.target.value)}
                                                                                rows={2}
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-2 lg:col-span-2">
                                                                            <Label>Keywords</Label>
                                                                            <Input
                                                                                value={step.keywords.join(', ')}
                                                                                onChange={(e) => handleStepChange(step.id, 'keywords', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                                                                placeholder="pisahkan dengan koma"
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Label>Evidence (Bukti)</Label>
                                                                            <Select value={step.required_evidence} onValueChange={(value) => handleStepChange(step.id, 'required_evidence', value as SopStep['required_evidence'])}>
                                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="comment">Komentar Teks</SelectItem>
                                                                                    <SelectItem value="media">Media (Foto/File)</SelectItem>
                                                                                    <SelectItem value="both">Komentar + Media</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Label>Priority</Label>
                                                                            <Select value={step.priority} onValueChange={(value) => handleStepChange(step.id, 'priority', value as SopStep['priority'])}>
                                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="high">Tinggi</SelectItem>
                                                                                    <SelectItem value="medium">Sedang</SelectItem>
                                                                                    <SelectItem value="low">Rendah</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                                        <div className="space-y-2 hidden">
                                                                            <Label className="text-xs">Bobot (Weight)</Label>
                                                                            <Input type="number" min={0} value={step.weight} onChange={(e) => handleStepChange(step.id, 'weight', Number(e.target.value))} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">Min Comment</Label>
                                                                            <Input type="number" min={0} value={step.min_comment} onChange={(e) => handleStepChange(step.id, 'min_comment', Number(e.target.value))} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">Min Media</Label>
                                                                            <Input type="number" min={0} value={step.min_media} onChange={(e) => handleStepChange(step.id, 'min_media', Number(e.target.value))} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">Skor Kurang</Label>
                                                                            <Input type="number" min={0} value={step.score_kurang} onChange={(e) => handleStepChange(step.id, 'score_kurang', Number(e.target.value))} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">Skor Cukup</Label>
                                                                            <Input type="number" min={0} value={step.score_cukup} onChange={(e) => handleStepChange(step.id, 'score_cukup', Number(e.target.value))} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs">Skor Baik</Label>
                                                                            <Input type="number" min={0} value={step.score_sangat_baik} onChange={(e) => handleStepChange(step.id, 'score_sangat_baik', Number(e.target.value))} />
                                                                        </div>
                                                                    </div>

                                                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                                        <input type="checkbox" checked={step.is_mandatory} onChange={(e) => handleStepChange(step.id, 'is_mandatory', e.target.checked)} className="rounded border-slate-300" />
                                                                        Langkah ini wajib dilakukan (Mandatory)
                                                                    </label>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex justify-end gap-2 pt-2">
                                                                <Button size="sm" variant="outline" onClick={() => toggleAdvanced(step.id)} className="text-slate-500">
                                                                    {expandedSteps.includes(step.id) ? 'Tutup Pengaturan Lanjut' : 'Pengaturan Lanjut'}
                                                                    {expandedSteps.includes(step.id) ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                                                                </Button>
                                                                <Button size="sm" onClick={() => saveStep(step)} disabled={!draftSteps[step.id]}>
                                                                    Simpan Step
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </section>
        </div>
    );
}
