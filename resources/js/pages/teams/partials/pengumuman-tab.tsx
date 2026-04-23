import { usePage, router } from '@inertiajs/react';
import {
    Loader2,
    MessageSquare,
    MoreHorizontal,
    Paperclip,
    Pencil,
    Reply,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    destroy as destroyAnnouncement,
    update as updateAnnouncement,
} from '@/routes/announcements';
import { store as storeAnnouncementComment } from '@/routes/announcements/comments';
import {
    destroy as destroyComment,
    update as updateComment,
} from '@/routes/comments';
import { store as storeTeamAnnouncement } from '@/routes/teams/announcements';

type RecurrenceFrequency =
    | 'second'
    | 'minute'
    | 'hour'
    | 'day'
    | 'week'
    | 'month';

const WEEKDAY_OPTIONS = [
    { value: 1, label: 'Senin' },
    { value: 2, label: 'Selasa' },
    { value: 3, label: 'Rabu' },
    { value: 4, label: 'Kamis' },
    { value: 5, label: 'Jumat' },
    { value: 6, label: 'Sabtu' },
    { value: 7, label: 'Minggu' },
];

function formatFileSize(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadLimit(maxFileKb?: number) {
    return formatFileSize((maxFileKb ?? 20480) * 1024);
}

function isImage(mime: string) {
    return mime?.startsWith('image/');
}

function getInitials(name: string) {
    return (
        name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() || 'U'
    );
}

function formatRecurrenceLabel(
    frequency: RecurrenceFrequency,
    interval: number,
    options?: {
        weekday?: number;
        monthDay?: number;
        time?: string;
        limitUnit?: RecurrenceFrequency;
        limitValue?: number;
    },
) {
    const usesClockTime = !['second', 'minute', 'hour'].includes(frequency);
    const base = `Setiap ${Math.max(1, interval)} ${
        frequency === 'second'
            ? 'detik'
            : frequency === 'minute'
              ? 'menit'
              : frequency === 'hour'
                ? 'jam'
                : frequency === 'day'
                  ? 'hari'
                  : frequency === 'week'
                    ? 'minggu'
                    : 'bulan'
    }`;
    const detail =
        frequency === 'week'
            ? `, hari ${
                  WEEKDAY_OPTIONS.find(
                      ({ value }) => value === (options?.weekday ?? 1),
                  )?.label ?? 'Senin'
              }`
            : frequency === 'month'
              ? `, tanggal ${options?.monthDay ?? 1}`
              : '';

    return `${base}${detail}${
        usesClockTime && options?.time ? ` jam ${options.time.slice(0, 5)}` : ''
    }${
        options?.limitUnit && options?.limitValue
            ? `, batas ${options.limitValue} ${
                  options.limitUnit === 'day'
                      ? 'hari'
                      : options.limitUnit === 'second'
                        ? 'detik'
                        : options.limitUnit === 'minute'
                          ? 'menit'
                          : options.limitUnit === 'hour'
                            ? 'jam'
                            : options.limitUnit === 'week'
                              ? 'minggu'
                              : 'bulan'
              }`
            : ''
    }`;
}

function AttachmentPreviewList({
    files,
    onRemove,
}: {
    files: File[];
    onRemove: (index: number) => void;
}) {
    const previewUrls = useMemo(
        () =>
            files.map((file) =>
                isImage(file.type) ? URL.createObjectURL(file) : '',
            ),
        [files],
    );

    useEffect(() => {
        return () => {
            previewUrls.forEach((url) => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [previewUrls]);

    if (files.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-3 pt-2">
            {files.map((file, index) => {
                const previewUrl = previewUrls[index];

                if (previewUrl) {
                    return (
                        <div
                            key={`${file.name}-${index}`}
                            className="relative w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800"
                        >
                            <img
                                src={previewUrl}
                                alt={file.name}
                                className="h-36 w-full object-cover"
                            />
                            <div className="space-y-1 p-3">
                                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                    {file.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white transition hover:bg-black/80"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                }

                return (
                    <span
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    >
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        <span className="max-w-[150px] truncate">
                            {file.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {formatFileSize(file.size)}
                        </span>
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="ml-1 text-red-500 hover:text-red-700"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </span>
                );
            })}
        </div>
    );
}

function RecurrenceFields({
    enabled,
    onEnabledChange,
    frequency,
    onFrequencyChange,
    interval,
    onIntervalChange,
    weekday,
    onWeekdayChange,
    monthDay,
    onMonthDayChange,
    time,
    onTimeChange,
    limitUnit,
    onLimitUnitChange,
    limitValue,
    onLimitValueChange,
    isSuperadmin,
    disabled = false,
}: {
    enabled: boolean;
    onEnabledChange: (value: boolean) => void;
    frequency: RecurrenceFrequency;
    onFrequencyChange: (value: RecurrenceFrequency) => void;
    interval: number;
    onIntervalChange: (value: number) => void;
    weekday: number;
    onWeekdayChange: (value: number) => void;
    monthDay: number;
    onMonthDayChange: (value: number) => void;
    time: string;
    onTimeChange: (value: string) => void;
    limitUnit: RecurrenceFrequency;
    onLimitUnitChange: (value: RecurrenceFrequency) => void;
    limitValue: number;
    onLimitValueChange: (value: number) => void;
    isSuperadmin: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <label className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => onEnabledChange(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    disabled={disabled}
                />
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Jadikan reminder berulang
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Sistem akan membuat pengumuman baru otomatis sesuai
                        jadwal.
                    </p>
                </div>
            </label>

            {enabled && (
                <>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Frekuensi
                            </span>
                            <select
                                value={frequency}
                                onChange={(event) =>
                                    onFrequencyChange(
                                        event.target
                                            .value as RecurrenceFrequency,
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs transition outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900"
                                disabled={disabled}
                            >
                                {isSuperadmin && (
                                    <>
                                        <option value="second">
                                            Per Detik
                                        </option>
                                        <option value="minute">
                                            Per Menit
                                        </option>
                                        <option value="hour">Per Jam</option>
                                    </>
                                )}
                                <option value="day">Per Hari</option>
                                <option value="week">Per Minggu</option>
                                <option value="month">Per Bulan</option>
                            </select>
                        </label>

                        <label className="space-y-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Interval
                            </span>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={interval}
                                onChange={(event) =>
                                    onIntervalChange(
                                        Math.max(
                                            1,
                                            Number(event.target.value) || 1,
                                        ),
                                    )
                                }
                                disabled={disabled}
                            />
                        </label>

                        {frequency === 'week' && (
                            <label className="space-y-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Hari
                                </span>
                                <select
                                    value={weekday}
                                    onChange={(event) =>
                                        onWeekdayChange(
                                            Number(event.target.value),
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs transition outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900"
                                    disabled={disabled}
                                >
                                    {WEEKDAY_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {frequency === 'month' && (
                            <label className="space-y-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Tanggal
                                </span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={monthDay}
                                    onChange={(event) =>
                                        onMonthDayChange(
                                            Math.max(
                                                1,
                                                Math.min(
                                                    31,
                                                    Number(
                                                        event.target.value,
                                                    ) || 1,
                                                ),
                                            ),
                                        )
                                    }
                                    disabled={disabled}
                                />
                            </label>
                        )}

                        {!['second', 'minute', 'hour'].includes(frequency) && (
                            <label className="space-y-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Jam
                                </span>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(event) =>
                                        onTimeChange(
                                            event.target.value || '09:00',
                                        )
                                    }
                                    disabled={disabled}
                                />
                            </label>
                        )}

                        <label className="space-y-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Batas Durasi
                            </span>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={limitValue}
                                onChange={(event) =>
                                    onLimitValueChange(
                                        Math.max(
                                            1,
                                            Number(event.target.value) || 1,
                                        ),
                                    )
                                }
                                disabled={disabled}
                            />
                        </label>

                        <label className="space-y-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Satuan Batas
                            </span>
                            <select
                                value={limitUnit}
                                onChange={(event) =>
                                    onLimitUnitChange(
                                        event.target
                                            .value as RecurrenceFrequency,
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs transition outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900"
                                disabled={disabled}
                            >
                                {isSuperadmin && (
                                    <>
                                        <option value="second">Detik</option>
                                        <option value="minute">Menit</option>
                                        <option value="hour">Jam</option>
                                    </>
                                )}
                                <option value="day">Hari</option>
                                <option value="week">Minggu</option>
                                <option value="month">Bulan</option>
                            </select>
                        </label>
                    </div>

                    <p className="mt-3 text-xs font-medium text-primary">
                        {formatRecurrenceLabel(frequency, interval, {
                            weekday,
                            monthDay,
                            time,
                            limitUnit,
                            limitValue,
                        })}
                    </p>
                </>
            )}
        </div>
    );
}

function CommentItem({ comment, auth, onReply }: any) {
    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const canDelete = comment.user_id === auth?.user?.id || isGlobalAdmin;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editAttachments, setEditAttachments] = useState<File[]>([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState<number[]>(
        [],
    );
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const startEditing = (c: any) => {
        setEditingId(c.id);
        setEditContent(c.content);
        setEditAttachments([]);
        setEditRemovedMediaIds([]);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
        setEditAttachments([]);
        setEditRemovedMediaIds([]);
    };

    const saveEdit = (id: string) => {
        if (!editContent.replace(/<p><\/p>/g, '').trim()) {
            return;
        }

        router.put(
            updateComment.url(id),
            {
                content: editContent,
                new_attachments: editAttachments,
                removed_media_ids: editRemovedMediaIds,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: cancelEditing,
            },
        );
    };

    const handleDelete = () => {
        if (!confirm('Hapus komentar ini?')) {
            return;
        }

        router.delete(destroyComment.url(comment.id), { preserveScroll: true });
    };

    return (
        <div className="mb-3 flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {getInitials(comment.user?.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="mb-1 flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {comment.user?.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>
                            {new Date(comment.created_at).toLocaleDateString(
                                'id-ID',
                                {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                },
                            )}
                        </span>
                        {comment.user_id === auth?.user?.id && (
                            <button
                                onClick={() => startEditing(comment)}
                                className="transition-colors hover:text-primary"
                                title="Edit komentar"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={handleDelete}
                                className="transition-colors hover:text-red-500"
                                title="Hapus komentar"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                {editingId === comment.id ? (
                    <div className="flex flex-col gap-2">
                        <RichTextEditor
                            content={editContent}
                            onChange={setEditContent}
                        />
                        {editAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {editAttachments.map((f, i) => (
                                    <span
                                        key={i}
                                        className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] dark:bg-zinc-800"
                                    >
                                        <Paperclip className="h-3 w-3" />{' '}
                                        {f.name}
                                        <button
                                            onClick={() =>
                                                setEditAttachments((prev) =>
                                                    prev.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        {comment.media && comment.media.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {comment.media.map((m: any) =>
                                    editRemovedMediaIds.includes(
                                        m.id,
                                    ) ? null : (
                                        <span
                                            key={m.id}
                                            className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                                        >
                                            <Paperclip className="h-3 w-3" />
                                            <span className="max-w-[100px] truncate">
                                                {m.file_name}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setEditRemovedMediaIds(
                                                        (prev) => [
                                                            ...prev,
                                                            m.id,
                                                        ],
                                                    )
                                                }
                                                className="ml-1 text-red-500 hover:text-red-700"
                                                title="Hapus lampiran"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ),
                                )}
                            </div>
                        )}
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={editFileInputRef}
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    setEditAttachments((prev) => [
                                        ...prev,
                                        ...Array.from(e.target.files!),
                                    ]);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="flex h-7 items-center gap-1 text-xs text-muted-foreground"
                                onClick={() =>
                                    editFileInputRef.current?.click()
                                }
                            >
                                <Paperclip className="h-3.5 w-3.5" /> Lampirkan
                                File
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={cancelEditing}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => saveEdit(comment.id)}
                                >
                                    Simpan
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="text-sm text-slate-700 dark:text-slate-300 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:m-0 [&_strong]:font-bold [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                )}

                {comment.media && comment.media.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {comment.media.map((m: any) =>
                            isImage(m.mime_type) ? (
                                <a
                                    key={m.id}
                                    href={m.original_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block h-24 w-24 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                >
                                    <img
                                        src={m.original_url}
                                        className="h-full w-full object-cover"
                                        alt="attachment"
                                    />
                                </a>
                            ) : (
                                <a
                                    key={m.id}
                                    href={m.original_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                >
                                    <Paperclip className="h-3 w-3" />{' '}
                                    <span className="max-w-[120px] truncate">
                                        {m.file_name}
                                    </span>
                                </a>
                            ),
                        )}
                    </div>
                )}

                <button
                    onClick={() => onReply(comment.id)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary"
                >
                    <Reply className="h-3 w-3" /> Balas
                </button>

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-zinc-800">
                        {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                                <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                                    <AvatarImage src={reply.user?.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-[8px] text-primary">
                                        {getInitials(reply.user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="mb-0.5 flex items-start justify-between">
                                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                            {reply.user?.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                            <span>
                                                {new Date(
                                                    reply.created_at,
                                                ).toLocaleDateString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            {reply.user_id ===
                                                auth?.user?.id && (
                                                <button
                                                    onClick={() =>
                                                        startEditing(reply)
                                                    }
                                                    className="transition-colors hover:text-primary"
                                                    title="Edit balasan"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            )}
                                            {(reply.user_id ===
                                                auth?.user?.id ||
                                                isGlobalAdmin) && (
                                                <button
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                'Hapus balasan ini?',
                                                            )
                                                        ) {
                                                            router.delete(
                                                                `/comments/${reply.id}`,
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                    className="transition-colors hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {editingId === reply.id ? (
                                        <div className="flex flex-col gap-2">
                                            <RichTextEditor
                                                content={editContent}
                                                onChange={setEditContent}
                                            />
                                            {editAttachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {editAttachments.map(
                                                        (f, i) => (
                                                            <span
                                                                key={i}
                                                                className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] dark:bg-zinc-800"
                                                            >
                                                                <Paperclip className="h-3 w-3" />{' '}
                                                                {f.name}
                                                                <button
                                                                    onClick={() =>
                                                                        setEditAttachments(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        _,
                                                                                        idx,
                                                                                    ) =>
                                                                                        idx !==
                                                                                        i,
                                                                                ),
                                                                        )
                                                                    }
                                                                    className="ml-1 text-red-500 hover:text-red-700"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                            {reply.media &&
                                                reply.media.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {reply.media.map(
                                                            (m: any) =>
                                                                editRemovedMediaIds.includes(
                                                                    m.id,
                                                                ) ? null : (
                                                                    <span
                                                                        key={
                                                                            m.id
                                                                        }
                                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                                                                    >
                                                                        <Paperclip className="h-3 w-3" />
                                                                        <span className="max-w-[100px] truncate">
                                                                            {
                                                                                m.file_name
                                                                            }
                                                                        </span>
                                                                        <button
                                                                            onClick={() =>
                                                                                setEditRemovedMediaIds(
                                                                                    (
                                                                                        prev,
                                                                                    ) => [
                                                                                        ...prev,
                                                                                        m.id,
                                                                                    ],
                                                                                )
                                                                            }
                                                                            className="ml-1 text-red-500 hover:text-red-700"
                                                                            title="Hapus lampiran"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </span>
                                                                ),
                                                        )}
                                                    </div>
                                                )}
                                            <div className="flex items-center justify-between">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex h-6 items-center gap-1 text-xs text-muted-foreground"
                                                    onClick={() =>
                                                        editFileInputRef.current?.click()
                                                    }
                                                >
                                                    <Paperclip className="h-3.5 w-3.5" />{' '}
                                                    Lampirkan File
                                                </Button>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={cancelEditing}
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={() =>
                                                            saveEdit(reply.id)
                                                        }
                                                    >
                                                        Simpan
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="text-xs text-slate-700 dark:text-slate-300 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:m-0 [&_strong]:font-bold [&_ul]:list-disc"
                                            dangerouslySetInnerHTML={{
                                                __html: reply.content,
                                            }}
                                        />
                                    )}
                                    {reply.media && reply.media.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                            {reply.media.map((m: any) =>
                                                isImage(m.mime_type) ? (
                                                    <a
                                                        key={m.id}
                                                        href={m.original_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block h-16 w-16 overflow-hidden rounded border border-slate-200 transition hover:ring-2 dark:border-slate-700"
                                                    >
                                                        <img
                                                            src={m.original_url}
                                                            className="h-full w-full object-cover"
                                                            alt="attachment"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        key={m.id}
                                                        href={m.original_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:underline"
                                                    >
                                                        <Paperclip className="h-3 w-3" />{' '}
                                                        <span className="max-w-[100px] truncate">
                                                            {m.file_name}
                                                        </span>
                                                    </a>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AnnouncementItem({ announcement, team, auth }: any) {
    const { uploads } = usePage().props as any;
    const maxFileLabel = formatUploadLimit(uploads?.documents?.maxFileKb);
    const isSuperadmin = auth?.roles?.includes('superadmin');
    const isGlobalAdmin = auth?.roles?.some((r: string) =>
        ['superadmin', 'admin'].includes(r),
    );
    const isTeamAdmin =
        team?.users?.find((u: any) => u.id === auth?.user?.id)?.pivot?.role ===
        'admin';
    const canEditDelete =
        isGlobalAdmin || isTeamAdmin || announcement.user_id === auth?.user?.id;

    const [commentContent, setCommentContent] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit state
    const [editTitle, setEditTitle] = useState(announcement.title || '');
    const [editContent, setEditContent] = useState(announcement.content || '');
    const [editAttachments, setEditAttachments] = useState<File[]>([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState<number[]>(
        [],
    );
    const [editIsRecurring, setEditIsRecurring] = useState(
        announcement.is_recurring ?? false,
    );
    const [editRecurrenceFrequency, setEditRecurrenceFrequency] =
        useState<RecurrenceFrequency>(
            announcement.recurrence_frequency || 'week',
        );
    const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(
        announcement.recurrence_interval || 1,
    );
    const [editRecurrenceWeekday, setEditRecurrenceWeekday] = useState(
        announcement.recurrence_weekday || 1,
    );
    const [editRecurrenceMonthDay, setEditRecurrenceMonthDay] = useState(
        announcement.recurrence_month_day || 1,
    );
    const [editRecurrenceTime, setEditRecurrenceTime] = useState(
        announcement.recurrence_time?.slice(0, 5) || '09:00',
    );
    const [editRecurrenceLimitUnit, setEditRecurrenceLimitUnit] =
        useState<RecurrenceFrequency>(
            announcement.recurrence_limit_unit || 'month',
        );
    const [editRecurrenceLimitValue, setEditRecurrenceLimitValue] = useState(
        announcement.recurrence_limit_value || 1,
    );
    const [saving, setSaving] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const editFileRef = useRef<HTMLInputElement>(null);

    const handleDelete = () => {
        if (confirm('Hapus pengumuman ini secara permanen?')) {
            router.delete(destroyAnnouncement.url(announcement.id), {
                preserveScroll: true,
            });
        }
    };

    const handleSaveEdit = () => {
        setSaving(true);
        router.put(
            updateAnnouncement.url(announcement.id),
            {
                title: editTitle,
                content: editContent,
                new_attachments: editAttachments,
                removed_media_ids: editRemovedMediaIds,
                is_recurring: editIsRecurring,
                recurrence_frequency: editIsRecurring
                    ? editRecurrenceFrequency
                    : null,
                recurrence_interval: editIsRecurring
                    ? editRecurrenceInterval
                    : null,
                recurrence_weekday:
                    editIsRecurring && editRecurrenceFrequency === 'week'
                        ? editRecurrenceWeekday
                        : null,
                recurrence_month_day:
                    editIsRecurring && editRecurrenceFrequency === 'month'
                        ? editRecurrenceMonthDay
                        : null,
                recurrence_time: editIsRecurring ? editRecurrenceTime : null,
                recurrence_limit_unit: editIsRecurring
                    ? editRecurrenceLimitUnit
                    : null,
                recurrence_limit_value: editIsRecurring
                    ? editRecurrenceLimitValue
                    : null,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setSaving(false);
                    setIsEditing(false);
                    setEditAttachments([]);
                    setEditRemovedMediaIds([]);
                },
                onError: () => setSaving(false),
            },
        );
    };

    const handleComment = () => {
        const cleanContent = commentContent.replace(/<p><\/p>/g, '').trim();

        if ((!cleanContent && attachments.length === 0) || sending) {
            return;
        }

        setSending(true);
        router.post(
            storeAnnouncementComment.url(announcement.id),
            {
                content: cleanContent || '<p></p>',
                parent_id: replyingTo,
                attachments: attachments,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSending(false);
                    setCommentContent('');
                    setAttachments([]);
                    setReplyingTo(null);

                    if (fileRef.current) {
                        fileRef.current.value = '';
                    }
                },
                onError: () => setSending(false),
            },
        );
    };

    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={announcement.user?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {getInitials(announcement.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {announcement.user?.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            {new Date(
                                announcement.created_at,
                            ).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {announcement.is_recurring &&
                                !announcement.source_announcement_id && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                        Reminder aktif:{' '}
                                        {formatRecurrenceLabel(
                                            announcement.recurrence_frequency,
                                            announcement.recurrence_interval,
                                            {
                                                weekday:
                                                    announcement.recurrence_weekday,
                                                monthDay:
                                                    announcement.recurrence_month_day,
                                                time: announcement.recurrence_time,
                                                limitUnit:
                                                    announcement.recurrence_limit_unit,
                                                limitValue:
                                                    announcement.recurrence_limit_value,
                                            },
                                        )}
                                    </span>
                                )}
                            {announcement.source_announcement_id && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    Reminder otomatis
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {canEditDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground"
                            >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditTitle(announcement.title || '');
                                    setEditContent(announcement.content || '');
                                    setEditAttachments([]);
                                    setEditRemovedMediaIds([]);
                                    setEditIsRecurring(
                                        announcement.is_recurring ?? false,
                                    );
                                    setEditRecurrenceFrequency(
                                        announcement.recurrence_frequency ||
                                            'week',
                                    );
                                    setEditRecurrenceInterval(
                                        announcement.recurrence_interval || 1,
                                    );
                                    setEditRecurrenceWeekday(
                                        announcement.recurrence_weekday || 1,
                                    );
                                    setEditRecurrenceMonthDay(
                                        announcement.recurrence_month_day || 1,
                                    );
                                    setEditRecurrenceTime(
                                        announcement.recurrence_time?.slice(
                                            0,
                                            5,
                                        ) || '09:00',
                                    );
                                    setEditRecurrenceLimitUnit(
                                        announcement.recurrence_limit_unit ||
                                            'month',
                                    );
                                    setEditRecurrenceLimitValue(
                                        announcement.recurrence_limit_value ||
                                            1,
                                    );
                                }}
                            >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                Pengumuman
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={handleDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content body */}
            {isEditing ? (
                <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Judul Pengumuman (Opsional)"
                        className="font-semibold"
                    />
                    <RichTextEditor
                        content={editContent}
                        onChange={setEditContent}
                        users={team?.users}
                        disabled={saving}
                    />
                    <RecurrenceFields
                        enabled={editIsRecurring}
                        onEnabledChange={setEditIsRecurring}
                        frequency={editRecurrenceFrequency}
                        onFrequencyChange={setEditRecurrenceFrequency}
                        interval={editRecurrenceInterval}
                        onIntervalChange={setEditRecurrenceInterval}
                        weekday={editRecurrenceWeekday}
                        onWeekdayChange={setEditRecurrenceWeekday}
                        monthDay={editRecurrenceMonthDay}
                        onMonthDayChange={setEditRecurrenceMonthDay}
                        time={editRecurrenceTime}
                        onTimeChange={setEditRecurrenceTime}
                        limitUnit={editRecurrenceLimitUnit}
                        onLimitUnitChange={setEditRecurrenceLimitUnit}
                        limitValue={editRecurrenceLimitValue}
                        onLimitValueChange={setEditRecurrenceLimitValue}
                        isSuperadmin={isSuperadmin}
                        disabled={saving}
                    />
                    {announcement.media && announcement.media.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {announcement.media.map((media: any) =>
                                editRemovedMediaIds.includes(
                                    media.id,
                                ) ? null : isImage(media.mime_type) ? (
                                    <div
                                        key={media.id}
                                        className="relative w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <img
                                            src={media.original_url}
                                            alt={media.file_name}
                                            className="h-36 w-full object-cover"
                                        />
                                        <div className="p-3">
                                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                {media.file_name}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditRemovedMediaIds(
                                                    (current) => [
                                                        ...current,
                                                        media.id,
                                                    ],
                                                )
                                            }
                                            className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white transition hover:bg-black/80"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <span
                                        key={media.id}
                                        className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                                        <span className="max-w-[150px] truncate">
                                            {media.file_name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditRemovedMediaIds(
                                                    (current) => [
                                                        ...current,
                                                        media.id,
                                                    ],
                                                )
                                            }
                                            className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ),
                            )}
                        </div>
                    )}
                    <AttachmentPreviewList
                        files={editAttachments}
                        onRemove={(index) =>
                            setEditAttachments((current) =>
                                current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                ),
                            )
                        }
                    />
                    <input
                        type="file"
                        ref={editFileRef}
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            const files = event.currentTarget.files;

                            if (files) {
                                setEditAttachments((current) => [
                                    ...current,
                                    ...Array.from(files),
                                ]);
                                event.currentTarget.value = '';
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editFileRef.current?.click()}
                            type="button"
                        >
                            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                            Lampirkan file
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                                setEditAttachments([]);
                                setEditRemovedMediaIds([]);
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={saving}
                            onClick={handleSaveEdit}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Menyimpan
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    {announcement.title && (
                        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                            {announcement.title}
                        </h3>
                    )}
                    <div
                        className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{
                            __html: announcement.content,
                        }}
                    />

                    {/* Media render */}
                    {announcement.media && announcement.media.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {announcement.media.map((m: any) =>
                                isImage(m.mime_type) ? (
                                    <a
                                        key={m.id}
                                        href={m.original_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block max-w-[300px] overflow-hidden rounded-lg border border-slate-200 transition hover:shadow-md dark:border-slate-700"
                                    >
                                        <img
                                            src={m.original_url}
                                            className="h-auto w-full"
                                            alt={m.file_name}
                                        />
                                    </a>
                                ) : (
                                    <a
                                        key={m.id}
                                        href={m.original_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex min-w-[200px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/80"
                                    >
                                        <div className="rounded-md bg-primary/10 p-2">
                                            <Paperclip className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {m.file_name}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {formatFileSize(m.size)}
                                            </div>
                                        </div>
                                    </a>
                                ),
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Comments List */}
            <div className="border-t border-slate-200 pt-4 dark:border-zinc-800">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-4 w-4" />{' '}
                    {announcement.comments?.length || 0} Komentar
                </div>

                {announcement.comments
                    ?.filter((c: any) => !c.parent_id)
                    .map((comment: any) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            team={team}
                            auth={auth}
                            onReply={setReplyingTo}
                        />
                    ))}

                {/* Comment Form */}
                <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4 text-sm dark:border-zinc-800">
                    <Avatar className="hidden h-8 w-8 shrink-0 sm:block">
                        <AvatarImage src={auth?.user?.avatar_url} />
                        <AvatarFallback>
                            {getInitials(auth?.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="relative flex flex-1 flex-col gap-2">
                        {replyingTo && (
                            <div className="-mb-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-muted-foreground dark:border-zinc-700/50 dark:bg-zinc-800/50">
                                <span>Membalas komentar...</span>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="hover:text-slate-900 dark:hover:text-slate-100"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <RichTextEditor
                            content={commentContent}
                            onChange={setCommentContent}
                            users={team?.users}
                            disabled={sending}
                            placeholder={
                                replyingTo
                                    ? 'Tulis balasan... ketik @ untuk tag anggota'
                                    : 'Tulis komentar... ketik @ untuk tag anggota'
                            }
                            minHeight="min-h-[40px]"
                        />

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((f, i) => (
                                    <span
                                        key={i}
                                        className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <Paperclip className="h-3 w-3" />{' '}
                                        <span className="max-w-[100px] truncate">
                                            {f.name}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setAttachments(
                                                    attachments.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-1 flex items-center justify-between">
                            <input
                                type="file"
                                ref={fileRef}
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = e.currentTarget.files;

                                    if (files) {
                                        setAttachments([
                                            ...attachments,
                                            ...Array.from(files),
                                        ]);
                                    }
                                }}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px]"
                                onClick={() => fileRef.current?.click()}
                                type="button"
                            >
                                <Paperclip className="mr-1 h-3.5 w-3.5" />{' '}
                                Lampirkan file
                            </Button>

                            <Button
                                size="sm"
                                className="h-8"
                                disabled={
                                    sending ||
                                    (!commentContent
                                        .replace(/<p><\/p>/g, '')
                                        .trim() &&
                                        attachments.length === 0)
                                }
                                onClick={handleComment}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{' '}
                                        Mengirim
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-1.5 h-3.5 w-3.5" />{' '}
                                        Kirim
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Maks. {maxFileLabel} per file.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PengumumanTab({ team }: { team: any }) {
    const { announcements, auth, uploads } = usePage<any>().props;
    const isSuperadmin = auth?.roles?.includes('superadmin');
    const maxFileLabel = formatUploadLimit(uploads?.documents?.maxFileKb);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] =
        useState<RecurrenceFrequency>('week');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceWeekday, setRecurrenceWeekday] = useState(1);
    const [recurrenceMonthDay, setRecurrenceMonthDay] = useState(1);
    const [recurrenceTime, setRecurrenceTime] = useState('09:00');
    const [recurrenceLimitUnit, setRecurrenceLimitUnit] =
        useState<RecurrenceFrequency>('month');
    const [recurrenceLimitValue, setRecurrenceLimitValue] = useState(1);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleCreate = () => {
        const cleanContent = content.replace(/<p><\/p>/g, '').trim();

        if (!cleanContent) {
            return;
        }

        setCreating(true);
        router.post(
            storeTeamAnnouncement.url(team.id),
            {
                title,
                content: cleanContent,
                attachments,
                is_recurring: isRecurring,
                recurrence_frequency: isRecurring ? recurrenceFrequency : null,
                recurrence_interval: isRecurring ? recurrenceInterval : null,
                recurrence_weekday:
                    isRecurring && recurrenceFrequency === 'week'
                        ? recurrenceWeekday
                        : null,
                recurrence_month_day:
                    isRecurring && recurrenceFrequency === 'month'
                        ? recurrenceMonthDay
                        : null,
                recurrence_time: isRecurring ? recurrenceTime : null,
                recurrence_limit_unit: isRecurring ? recurrenceLimitUnit : null,
                recurrence_limit_value: isRecurring
                    ? recurrenceLimitValue
                    : null,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setCreating(false);
                    setTitle('');
                    setContent('');
                    setAttachments([]);
                    setIsRecurring(false);
                    setRecurrenceFrequency('week');
                    setRecurrenceInterval(1);
                    setRecurrenceWeekday(1);
                    setRecurrenceMonthDay(1);
                    setRecurrenceTime('09:00');
                    setRecurrenceLimitUnit('month');
                    setRecurrenceLimitValue(1);
                    setShowForm(false);

                    if (fileRef.current) {
                        fileRef.current.value = '';
                    }
                },
                onError: () => setCreating(false),
            },
        );
    };

    return (
        <div className="custom-scrollbar flex h-full max-h-[calc(100vh-14rem)] flex-col overflow-y-auto pr-2">
            <div className="mx-auto w-full max-w-4xl">
                {/* Form Bikin Pengumuman Baru */}
                {!showForm ? (
                    <div
                        className="group mb-6 flex cursor-text items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sidebar-border dark:border-zinc-800 dark:bg-zinc-900"
                        onClick={() => setShowForm(true)}
                    >
                        <div className="flex w-full items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={auth?.user?.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(auth?.user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-sm text-muted-foreground transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                Buat pengumuman baru untuk tim...
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-white p-5 shadow-sm dark:border-primary/30 dark:bg-zinc-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                Buat Pengumuman
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:bg-slate-100"
                                onClick={() => setShowForm(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul (Opsional)"
                                className="text-md border-slate-200 bg-slate-50 font-semibold placeholder:font-normal dark:border-zinc-700 dark:bg-zinc-800/50"
                            />

                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                users={team?.users}
                                disabled={creating}
                                placeholder="Isi pengumuman Anda di sini... ketik @ untuk tag anggota"
                            />
                            <RecurrenceFields
                                enabled={isRecurring}
                                onEnabledChange={setIsRecurring}
                                frequency={recurrenceFrequency}
                                onFrequencyChange={setRecurrenceFrequency}
                                interval={recurrenceInterval}
                                onIntervalChange={setRecurrenceInterval}
                                weekday={recurrenceWeekday}
                                onWeekdayChange={setRecurrenceWeekday}
                                monthDay={recurrenceMonthDay}
                                onMonthDayChange={setRecurrenceMonthDay}
                                time={recurrenceTime}
                                onTimeChange={setRecurrenceTime}
                                limitUnit={recurrenceLimitUnit}
                                onLimitUnitChange={setRecurrenceLimitUnit}
                                limitValue={recurrenceLimitValue}
                                onLimitValueChange={setRecurrenceLimitValue}
                                isSuperadmin={isSuperadmin}
                                disabled={creating}
                            />
                            <AttachmentPreviewList
                                files={attachments}
                                onRemove={(index) =>
                                    setAttachments((current) =>
                                        current.filter(
                                            (_, itemIndex) =>
                                                itemIndex !== index,
                                        ),
                                    )
                                }
                            />

                            <div className="flex items-center justify-between pt-2">
                                <input
                                    type="file"
                                    ref={fileRef}
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = e.currentTarget.files;

                                        if (files) {
                                            setAttachments([
                                                ...attachments,
                                                ...Array.from(files),
                                            ]);
                                        }
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileRef.current?.click()}
                                    type="button"
                                    className="gap-2"
                                >
                                    <Paperclip className="h-4 w-4" /> Lampirkan
                                    file
                                </Button>

                                <Button
                                    size="sm"
                                    disabled={
                                        creating ||
                                        !content.replace(/<p><\/p>/g, '').trim()
                                    }
                                    onClick={handleCreate}
                                    className="px-6"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                                            Posting
                                        </>
                                    ) : (
                                        'Posting Pengumuman'
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Maks. {maxFileLabel} per file.
                            </p>
                        </div>
                    </div>
                )}

                {/* List Pengumuman */}
                {!announcements || announcements.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                            <MessageSquare className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-300">
                            Belum ada pengumuman
                        </h3>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                            Gunakan fitur ini untuk membagikan informasi
                            penting, update proyek, atau pembaruan kepada
                            seluruh anggota tim.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {announcements.data.map((announcement: any) => (
                            <AnnouncementItem
                                key={announcement.id}
                                announcement={announcement}
                                team={team}
                                auth={auth}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
