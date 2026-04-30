import { Head, router, setLayoutProps } from '@inertiajs/react';
import { Pencil, RefreshCcw, Save, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import * as ReportingActions from '@/actions/App/Http/Controllers/ReportingController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type BreakdownJalur = {
    nama_jalur: string;
    skor: number;
    skor_maksimal: number;
    score_kurang: number;
    score_cukup: number;
    score_sangat_baik: number;
    level: string;
    penjelasan: string;
    is_mandatory: boolean;
    edited?: boolean;
};

type MemberTask = {
    task_id: string;
    nama_task: string;
    kolom_saat_ini: string | null;
    is_done: boolean;
    due_date: string | null;
    total_komentar: number;
    total_attachment: number;
    skor_total_task: number;
    skor_maksimal_task: number;
    compliance_persen: string;
    quality: string;
    admin_note?: string;
    breakdown_jalur: BreakdownJalur[];
};

type MemberReport = {
    member_key: string;
    user_id: number | null;
    name: string;
    position: string | null;
    jumlah_task: number;
    total_score: number;
    skor_maksimal: number;
    compliance_persen: string;
    performance_label: 'excellent' | 'good' | 'watch' | 'critical';
    breakdown_task: MemberTask[];
};

type TeamReport = {
    team_id: string;
    team_name: string;
    team_slug: string | null;
    audit_step_count: number;
    summary: {
        task_count: number;
        completed_count: number;
        open_count: number;
        overdue_count: number;
        member_count: number;
    };
    members: MemberReport[];
};

type ReportPayload = {
    id: number;
    month: string;
    platform: string;
    team?: {
        id: string;
        name: string;
        slug: string | null;
    } | null;
    generated_at: string;
    model: string;
    source_task_count: number;
    report: {
        overview: {
            headline: string;
            summary: string;
            metrics: {
                task_count: number;
                completed_count: number;
                overdue_count: number;
                team_count: number;
                member_count: number;
            };
        };
        teams: TeamReport[];
    };
};

const qualityOptions = [
    'Sangat Baik — evidence lengkap dan terdokumentasi',
    'Baik — mayoritas step terdokumentasi',
    'Cukup — beberapa step belum terdokumentasi',
    'Kurang — banyak step tanpa evidence',
];

function toneClass(label: MemberReport['performance_label']): string {
    if (label === 'excellent') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (label === 'watch') {
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    if (label === 'critical') {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    return 'border-sky-200 bg-sky-50 text-sky-700';
}

function toneLabel(label: MemberReport['performance_label']): string {
    if (label === 'excellent') {
        return 'Sangat Baik';
    }

    if (label === 'watch') {
        return 'Perlu Atensi';
    }

    if (label === 'critical') {
        return 'Kritis';
    }

    return 'Baik';
}

function scoreBadgeClass(skor: number, jalur: BreakdownJalur): string {
    const { score_kurang, score_cukup, score_sangat_baik } = jalur;

    if (skor === 0) {
        return 'border-slate-200 bg-slate-50 text-slate-500';
    }

    if (score_sangat_baik > 0 && skor > score_cukup) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (score_cukup > 0 && skor > score_kurang) {
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }

    return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default function ReportingShow({
    report,
    canEdit = false,
}: {
    report: ReportPayload;
    canEdit?: boolean;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Reporting', href: ReportingActions.index.url() },
            {
                title: report.month,
                href: ReportingActions.show.url(report.id),
            },
        ],
    });

    const [editingMemberKey, setEditingMemberKey] = useState<string | null>(null);
    const [editData, setEditData] = useState<TeamReport[]>([]);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const startEditing = useCallback((memberKey: string) => {
        setEditData(JSON.parse(JSON.stringify(report.report.teams)));
        setEditingMemberKey(memberKey);
    }, [report.report.teams]);

    const cancelEditing = useCallback(() => {
        setEditingMemberKey(null);
        setEditData([]);
    }, []);

    const updateScore = (
        teamIdx: number,
        memberIdx: number,
        taskIdx: number,
        jalurIdx: number,
        value: number,
    ) => {
        setEditData((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const jalur =
                next[teamIdx].members[memberIdx].breakdown_task[taskIdx]
                    .breakdown_jalur[jalurIdx];
            jalur.skor = Math.max(
                0,
                Math.min(value, jalur.score_sangat_baik || jalur.skor_maksimal || 10),
            );

            return next;
        });
    };

    const updateAdminNote = (
        teamIdx: number,
        memberIdx: number,
        taskIdx: number,
        value: string,
    ) => {
        setEditData((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[teamIdx].members[memberIdx].breakdown_task[
                taskIdx
            ].admin_note = value;

            return next;
        });
    };

    const updateQuality = (
        teamIdx: number,
        memberIdx: number,
        taskIdx: number,
        value: string,
    ) => {
        setEditData((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[teamIdx].members[memberIdx].breakdown_task[taskIdx].quality =
                value;

            return next;
        });
    };

    const saveChanges = () => {
        setSaving(true);

        const teamsPayload = editData.map((team) => ({
            members: team.members.map((member) => ({
                breakdown_task: member.breakdown_task.map((task) => ({
                    breakdown_jalur: task.breakdown_jalur.map((jalur) => ({
                        skor: jalur.skor,
                    })),
                    admin_note: task.admin_note || null,
                    quality: task.quality || null,
                })),
            })),
        }));

        router.put(
            ReportingActions.update.url(report.id),
            { teams: teamsPayload },
            {
                onFinish: () => {
                    setSaving(false);
                    setEditingMemberKey(null);
                    setEditData([]);
                },
            },
        );
    };

    const handleRegenerate = () => {
        if (
            !confirm(
                'Report lama akan dihapus dan digenerate ulang. Lanjutkan?',
            )
        ) {
            return;
        }

        setRegenerating(true);
        router.post(
            ReportingActions.regenerate.url(report.id),
            {},
            {
                onFinish: () => setRegenerating(false),
            },
        );
    };

    const displayTeams = editingMemberKey ? editData : report.report.teams;

    return (
        <>
            <Head title={`Reporting ${report.month}`} />

            <div className="flex flex-1 flex-col gap-6">
                {canEdit && (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerate}
                            disabled={regenerating || saving || editingMemberKey !== null}
                        >
                            {regenerating ? (
                                <RefreshCcw className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="mr-1 h-4 w-4" />
                            )}
                            {regenerating ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                    </div>
                )}

                <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    {[
                        [
                            'Total Task',
                            report.report.overview.metrics.task_count,
                        ],
                        [
                            'Selesai',
                            report.report.overview.metrics.completed_count,
                        ],
                        [
                            'Overdue',
                            report.report.overview.metrics.overdue_count,
                        ],
                        ['Team', report.report.overview.metrics.team_count],
                        ['Orang', report.report.overview.metrics.member_count],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="text-sm text-slate-500">
                                {label}
                            </div>
                            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                                {value}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {report.report.overview.headline}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {report.report.overview.summary}
                                </p>
                            </div>
                            <Badge variant="outline" className="rounded-full">
                                {report.month}
                            </Badge>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                        <div className="text-sm text-slate-300">Metadata</div>
                        <div className="mt-4 space-y-4 text-sm">
                            <div>
                                <div className="text-slate-400">
                                    Digenerate
                                </div>
                                <div className="mt-1 font-medium">
                                    {report.generated_at}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400">Team</div>
                                <div className="mt-1 font-medium">
                                    {report.team?.name ?? '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400">Model</div>
                                <div className="mt-1 font-medium">
                                    {report.model}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400">Metode</div>
                                <div className="mt-1 font-medium">
                                    SOP Step Scoring
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400">
                                    Task sumber
                                </div>
                                <div className="mt-1 font-medium">
                                    {report.source_task_count}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-5">
                    {displayTeams.map((team, teamIdx) => (
                        <article
                            key={team.team_id}
                            className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="border-b border-slate-100 bg-slate-50/70 p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">
                                            {team.team_name}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            SOP aktif memiliki{' '}
                                            {team.audit_step_count} jalur
                                            penilaian.
                                        </p>
                                    </div>
                                    <div className="grid w-full grid-cols-2 gap-3 text-sm sm:w-72 lg:min-w-72">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-slate-500">
                                                Task
                                            </div>
                                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                                {team.summary.task_count}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-slate-500">
                                                Orang
                                            </div>
                                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                                {team.summary.member_count}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-slate-500">
                                                Selesai
                                            </div>
                                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                                {team.summary.completed_count}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-slate-500">
                                                Overdue
                                            </div>
                                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                                {team.summary.overdue_count}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 p-6">
                                {team.members.map((member, memberIdx) => (
                                    <div
                                        key={member.member_key}
                                        className="overflow-hidden rounded-2xl border border-slate-200"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0">
                                            <div>
                                                <div className="text-lg font-semibold text-slate-900">
                                                    {member.name}
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    {member.position ||
                                                        'Tanpa posisi'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-full ${toneClass(member.performance_label)}`}
                                                >
                                                    {toneLabel(
                                                        member.performance_label,
                                                    )}
                                                </Badge>
                                                {canEdit && editingMemberKey !== member.member_key && (
                                                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => startEditing(member.member_key)}>
                                                        <Pencil className="mr-1 h-3 w-3" /> Edit
                                                    </Button>
                                                )}
                                                {canEdit && editingMemberKey === member.member_key && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={cancelEditing} disabled={saving}>
                                                            <X className="mr-1 h-3 w-3" /> Batal
                                                        </Button>
                                                        <Button size="sm" className="h-6 text-xs px-2" onClick={saveChanges} disabled={saving}>
                                                            <Save className="mr-1 h-3 w-3" /> {saving ? 'Simpan...' : 'Simpan'}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3 px-5 text-sm sm:grid-cols-4">
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-xs text-slate-500">
                                                    Total Task
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                                    {member.jumlah_task}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-xs text-slate-500">
                                                    Total Score
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                                    {member.total_score}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-xs text-slate-500">
                                                    Maksimal
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                                    {member.skor_maksimal}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-xs text-slate-500">
                                                    Compliance
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                                    {member.compliance_persen}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 overflow-x-auto">
                                            <div className="min-w-max">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 text-slate-500">
                                                        <tr>
                                                            <th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[200px] max-w-[300px] sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                                Task Name
                                                            </th>
                                                            <th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[120px]">
                                                                Status
                                                            </th>
                                                            <th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[120px]">
                                                                Tanggal
                                                            </th>
                                                            <th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Comment
                                                            </th>
                                                            <th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Attachment
                                                            </th>
                                                            {(
                                                                member
                                                                    .breakdown_task?.[0]
                                                                    ?.breakdown_jalur ||
                                                                []
                                                            ).map(
                                                                (
                                                                    jalur,
                                                                    index,
                                                                ) => (
                                                                    <th
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[120px]"
                                                                        title={`Range: 0-${jalur.score_kurang} (Kurang), ${jalur.score_kurang + 1}-${jalur.score_cukup} (Cukup), ${jalur.score_cukup + 1}-${jalur.score_sangat_baik} (Sangat Baik)`}
                                                                    >
                                                                        <div>
                                                                            Score
                                                                            (
                                                                            {
                                                                                jalur.nama_jalur
                                                                            }
                                                                            )
                                                                        </div>
                                                                        <div className="text-[10px] font-normal text-slate-400">
                                                                            max:{' '}
                                                                            {
                                                                                jalur.score_sangat_baik
                                                                            }
                                                                        </div>
                                                                    </th>
                                                                ),
                                                            )}
                                                            <th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Total
                                                            </th>
                                                            <th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Max Score
                                                            </th>
                                                            <th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Percentage
                                                            </th>
                                                            <th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[180px]">
                                                                Kualitas
                                                            </th>
                                                            {editingMemberKey === member.member_key && (
                                                                <th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[200px]">
                                                                    Catatan
                                                                    Admin
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(
                                                            member.breakdown_task ||
                                                            []
                                                        ).map(
                                                            (
                                                                task,
                                                                taskIdx,
                                                            ) => {
                                                                const taskTotalScore =
                                                                    editingMemberKey === member.member_key
                                                                        ? task.breakdown_jalur.reduce(
                                                                              (
                                                                                  sum: number,
                                                                                  j: BreakdownJalur,
                                                                              ) =>
                                                                                  sum +
                                                                                  j.skor,
                                                                              0,
                                                                          )
                                                                        : task.skor_total_task;
                                                                const taskMaxScore =
                                                                    editingMemberKey === member.member_key
                                                                        ? task.breakdown_jalur.reduce(
                                                                              (
                                                                                  sum: number,
                                                                                  j: BreakdownJalur,
                                                                              ) =>
                                                                                  sum +
                                                                                  (j.score_sangat_baik ||
                                                                                      j.skor_maksimal ||
                                                                                      10),
                                                                              0,
                                                                          )
                                                                        : task.skor_maksimal_task;
                                                                const taskCompliance =
                                                                    taskMaxScore >
                                                                    0
                                                                        ? (
                                                                              (taskTotalScore /
                                                                                  taskMaxScore) *
                                                                              100
                                                                          ).toFixed(
                                                                              1,
                                                                          )
                                                                        : '0.0';

                                                                return (
                                                                    <tr
                                                                        key={
                                                                            task.task_id
                                                                        }
                                                                        className="group transition-colors hover:bg-slate-50"
                                                                    >
                                                                        <td className="min-w-[200px] max-w-[300px] whitespace-normal align-top px-5 py-4 font-medium text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 transition-colors">
                                                                            {
                                                                                task.nama_task
                                                                            }
                                                                        </td>
                                                                        <td className="px-5 py-4 whitespace-normal align-top text-slate-600 min-w-[120px]">
                                                                            {task.kolom_saat_ini ||
                                                                                '-'}
                                                                        </td>
                                                                        <td className="px-5 py-4 whitespace-normal align-top text-slate-600 min-w-[120px]">
                                                                            {task.due_date ||
                                                                                '-'}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                task.total_komentar
                                                                            }
                                                                        </td>
                                                                        <td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                task.total_attachment
                                                                            }
                                                                        </td>
                                                                        {(
                                                                            task.breakdown_jalur ||
                                                                            []
                                                                        ).map(
                                                                            (
                                                                                jalur,
                                                                                jalurIdx,
                                                                            ) => (
                                                                                <td
                                                                                    key={
                                                                                        jalurIdx
                                                                                    }
                                                                                    className="px-5 py-4 text-center align-top min-w-[120px]"
                                                                                    title={
                                                                                        jalur.penjelasan
                                                                                    }
                                                                                >
                                                                                    {editingMemberKey === member.member_key ? (
                                                                                        <Input
                                                                                            type="number"
                                                                                            min={
                                                                                                0
                                                                                            }
                                                                                            max={
                                                                                                jalur.score_sangat_baik ||
                                                                                                jalur.skor_maksimal ||
                                                                                                10
                                                                                            }
                                                                                            value={
                                                                                                jalur.skor
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                updateScore(
                                                                                                    teamIdx,
                                                                                                    memberIdx,
                                                                                                    taskIdx,
                                                                                                    jalurIdx,
                                                                                                    parseInt(
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    ) ||
                                                                                                        0,
                                                                                                )
                                                                                            }
                                                                                            className="h-8 w-full max-w-[80px] text-center mx-auto"
                                                                                        />
                                                                                    ) : (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className={`font-mono text-xs ${scoreBadgeClass(jalur.skor, jalur)}`}
                                                                                        >
                                                                                            {
                                                                                                jalur.skor
                                                                                            }
                                                                                            {jalur.edited && (
                                                                                                <span className="ml-1 text-[10px] text-slate-400">
                                                                                                    *
                                                                                                </span>
                                                                                            )}
                                                                                        </Badge>
                                                                                    )}
                                                                                </td>
                                                                            ),
                                                                        )}
                                                                        <td className="px-5 py-4 text-center align-top font-semibold text-slate-900 min-w-[100px]">
                                                                            {
                                                                                taskTotalScore
                                                                            }
                                                                        </td>
                                                                        <td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                taskMaxScore
                                                                            }
                                                                        </td>
                                                                        <td className="px-5 py-4 text-center align-top min-w-[100px]">
                                                                            <span
                                                                                className={`font-medium ${parseFloat(taskCompliance) >= 80 ? 'text-emerald-600' : parseFloat(taskCompliance) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}
                                                                            >
                                                                                {
                                                                                    taskCompliance
                                                                                }
                                                                                %
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-5 py-4 text-xs text-slate-600 align-top min-w-[180px]">
                                                                            {editingMemberKey === member.member_key ? (
                                                                                <select
                                                                                    value={
                                                                                        task.quality ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        updateQuality(
                                                                                            teamIdx,
                                                                                            memberIdx,
                                                                                            taskIdx,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                                                                >
                                                                                    {qualityOptions.map(
                                                                                        (
                                                                                            opt,
                                                                                        ) => (
                                                                                            <option
                                                                                                key={
                                                                                                    opt
                                                                                                }
                                                                                                value={
                                                                                                    opt
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    opt
                                                                                                }
                                                                                            </option>
                                                                                        ),
                                                                                    )}
                                                                                </select>
                                                                            ) : (
                                                                                <span
                                                                                    className="whitespace-normal break-words"
                                                                                    title={
                                                                                        task.quality
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        task.quality
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        {editingMemberKey === member.member_key && (
                                                                            <td className="px-5 py-4 align-top min-w-[200px]">
                                                                                <Textarea
                                                                                    value={
                                                                                        task.admin_note ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        updateAdminNote(
                                                                                            teamIdx,
                                                                                            memberIdx,
                                                                                            taskIdx,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="Catatan..."
                                                                                    rows={
                                                                                        2
                                                                                    }
                                                                                    className="min-w-32 text-xs"
                                                                                />
                                                                            </td>
                                                                        )}
                                                                        {editingMemberKey !== member.member_key &&
                                                                            task.admin_note && (
                                                                                <td className="px-5 py-4 text-xs text-slate-500 align-top min-w-[200px] whitespace-normal break-words">
                                                                                    {
                                                                                        task.admin_note
                                                                                    }
                                                                                </td>
                                                                            )}
                                                                    </tr>
                                                                );
                                                            },
                                                        )}
                                                        {(
                                                            member.breakdown_task ||
                                                            []
                                                        ).length === 0 && (
                                                            <tr>
                                                                <td
                                                                    colSpan={
                                                                        100
                                                                    }
                                                                    className="px-3 py-8 text-center text-sm text-slate-500"
                                                                >
                                                                    Tidak ada
                                                                    task untuk
                                                                    dinilai pada
                                                                    periode ini.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </section>
            </div>
        </>
    );
}
