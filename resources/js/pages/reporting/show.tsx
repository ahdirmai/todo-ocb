import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarRange,
    FileBarChart2,
    Loader2,
    RefreshCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as ReportingActions from '@/actions/App/Http/Controllers/ReportingController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    breakdown_jalur: Array<{
        nama_jalur: string;
        skor: number;
        penjelasan: string;
    }>;
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

export default function ReportingShow({
    report,
}: {
    report: ReportPayload;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Reporting', href: ReportingActions.index.url() },
            { title: report.month, href: ReportingActions.show.url(report.id) },
        ],
    });

    return (
        <>
            <Head title={`Reporting ${report.month}`} />

            <div className="flex flex-1 flex-col gap-6">
                        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                            {[
                                [
                                    'Total Task',
                                    report.report.overview.metrics.task_count,
                                ],
                                [
                                    'Selesai',
                                    report.report.overview.metrics
                                        .completed_count,
                                ],
                                [
                                    'Overdue',
                                    report.report.overview.metrics
                                        .overdue_count,
                                ],
                                [
                                    'Team',
                                    report.report.overview.metrics.team_count,
                                ],
                                [
                                    'Orang',
                                    report.report.overview.metrics.member_count,
                                ],
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
                                    <Badge
                                        variant="outline"
                                        className="rounded-full"
                                    >
                                        {report.month}
                                    </Badge>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                                <div className="text-sm text-slate-300">
                                    Metadata
                                </div>
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
                                        <div className="text-slate-400">
                                            Team
                                        </div>
                                        <div className="mt-1 font-medium">
                                            {report.team?.name ?? '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400">
                                            Model
                                        </div>
                                        <div className="mt-1 font-medium">
                                            {report.model}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400">
                                            Metode
                                        </div>
                                        <div className="mt-1 font-medium">
                                            Word Match
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
                            {report.report.teams.map((team) => (
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
                                                    {team.audit_step_count}{' '}
                                                    jalur penilaian.
                                                </p>
                                            </div>
                                            <div className="grid w-full grid-cols-2 gap-3 text-sm sm:w-72 lg:min-w-72">
                                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                                    <div className="text-slate-500">
                                                        Task
                                                    </div>
                                                    <div className="mt-1 text-xl font-semibold text-slate-900">
                                                        {
                                                            team.summary
                                                                .task_count
                                                        }
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                                    <div className="text-slate-500">
                                                        Orang
                                                    </div>
                                                    <div className="mt-1 text-xl font-semibold text-slate-900">
                                                        {
                                                            team.summary
                                                                .member_count
                                                        }
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                                    <div className="text-slate-500">
                                                        Selesai
                                                    </div>
                                                    <div className="mt-1 text-xl font-semibold text-slate-900">
                                                        {
                                                            team.summary
                                                                .completed_count
                                                        }
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                                    <div className="text-slate-500">
                                                        Overdue
                                                    </div>
                                                    <div className="mt-1 text-xl font-semibold text-slate-900">
                                                        {
                                                            team.summary
                                                                .overdue_count
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 p-6">
                                        {team.members.map((member) => (
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
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded-full ${toneClass(member.performance_label)}`}
                                                    >
                                                        {toneLabel(
                                                            member.performance_label,
                                                        )}
                                                    </Badge>
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
                                                            {
                                                                member.skor_maksimal
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl bg-slate-50 p-3">
                                                        <div className="text-xs text-slate-500">
                                                            Compliance
                                                        </div>
                                                        <div className="mt-1 text-lg font-semibold text-slate-900">
                                                            {
                                                                member.compliance_persen
                                                            }
                                                            %
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-5 overflow-x-auto">
                                                    <div className="min-w-max">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 text-slate-500">
                                                                <tr>
                                                                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">
                                                                        Task
                                                                        Name
                                                                    </th>
                                                                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">
                                                                        Status
                                                                    </th>
                                                                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">
                                                                        Tanggal
                                                                    </th>
                                                                    <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                                                                        Comment
                                                                    </th>
                                                                    <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                                                                        Attachment
                                                                    </th>
                                                                    {(member.breakdown_task?.[0]?.breakdown_jalur || []).map(
                                                                        (
                                                                            jalur,
                                                                            index,
                                                                        ) => (
                                                                            <th
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="px-3 py-3 text-center font-medium whitespace-nowrap"
                                                                            >
                                                                                Score
                                                                                (
                                                                                {
                                                                                    jalur.nama_jalur
                                                                                }
                                                                                )
                                                                            </th>
                                                                        ),
                                                                    )}
                                                                    <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                                                                        Total
                                                                    </th>
                                                                    <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                                                                        Max
                                                                        Score
                                                                    </th>
                                                                    <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                                                                        Percentage
                                                                    </th>
                                                                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">
                                                                        Kualitas
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {(member.breakdown_task || []).map(
                                                                    (task) => (
                                                                        <tr
                                                                            key={
                                                                                task.task_id
                                                                            }
                                                                            className="transition-colors hover:bg-slate-50"
                                                                        >
                                                                            <td className="min-w-48 px-3 py-3 font-medium text-slate-900">
                                                                                {
                                                                                    task.nama_task
                                                                                }
                                                                            </td>
                                                                            <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                                                                                {task.kolom_saat_ini ||
                                                                                    '-'}
                                                                            </td>
                                                                            <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                                                                                {task.due_date ||
                                                                                    '-'}
                                                                            </td>
                                                                            <td className="px-3 py-3 text-center text-slate-600">
                                                                                {
                                                                                    task.total_komentar
                                                                                }
                                                                            </td>
                                                                            <td className="px-3 py-3 text-center text-slate-600">
                                                                                {
                                                                                    task.total_attachment
                                                                                }
                                                                            </td>
                                                                            {(task.breakdown_jalur || []).map(
                                                                                (
                                                                                    jalur,
                                                                                    index,
                                                                                ) => (
                                                                                    <td
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                        className="px-3 py-3 text-center"
                                                                                        title={
                                                                                            jalur.penjelasan
                                                                                        }
                                                                                    >
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className={`font-mono text-xs ${
                                                                                                jalur.skor === 10
                                                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                                    : jalur.skor === 6
                                                                                                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                                                                      : jalur.skor === 3
                                                                                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                                                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                                                                            }`}
                                                                                        >
                                                                                            {
                                                                                                jalur.skor
                                                                                            }
                                                                                        </Badge>
                                                                                    </td>
                                                                                ),
                                                                            )}
                                                                            <td className="px-3 py-3 text-center font-semibold text-slate-900">
                                                                                {
                                                                                    task.skor_total_task
                                                                                }
                                                                            </td>
                                                                            <td className="px-3 py-3 text-center text-slate-600">
                                                                                {
                                                                                    task.skor_maksimal_task
                                                                                }
                                                                            </td>
                                                                            <td className="px-3 py-3 text-center">
                                                                                <span
                                                                                    className={`font-medium ${parseFloat(task.compliance_persen) >= 80 ? 'text-emerald-600' : parseFloat(task.compliance_persen) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}
                                                                                >
                                                                                    {
                                                                                        task.compliance_persen
                                                                                    }
                                                                                    %
                                                                                </span>
                                                                            </td>
                                                                            <td
                                                                                className="max-w-48 truncate px-3 py-3 text-xs whitespace-nowrap text-slate-600"
                                                                                title={
                                                                                    task.quality
                                                                                }
                                                                            >
                                                                                {
                                                                                    task.quality
                                                                                }
                                                                            </td>
                                                                        </tr>
                                                                    ),
                                                                )}
                                                                {(member.breakdown_task || [])
                                                                    .length ===
                                                                    0 && (
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                100
                                                                            }
                                                                            className="px-3 py-8 text-center text-sm text-slate-500"
                                                                        >
                                                                            Tidak
                                                                            ada
                                                                            task
                                                                            untuk
                                                                            dinilai
                                                                            pada
                                                                            periode
                                                                            ini.
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
