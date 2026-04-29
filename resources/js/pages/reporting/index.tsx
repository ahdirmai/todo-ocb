import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    FileBarChart2,
    Loader2,
    RefreshCcw,
} from 'lucide-react';
import { useState } from 'react';
import * as ReportingActions from '@/actions/App/Http/Controllers/ReportingController';
import { Button } from '@/components/ui/button';

type ReportListPayload = {
    data: Array<{
        id: number;
        month: string;
        platform: string;
        team: { name: string } | null;
        generator: { name: string } | null;
        model: string;
        source_task_count: number;
        generated_at: string;
    }>;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

export default function ReportingIndex({
    teamOptions,
    reports,
}: {
    teamOptions: Array<{ id: string; name: string; slug: string | null }>;
    reports: ReportListPayload;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Reporting', href: ReportingActions.index.url() },
        ],
    });

    const [month, setMonth] = useState('');
    const [teamId, setTeamId] = useState('');
    const [loading, setLoading] = useState(false);
    const hasTeamOptions = teamOptions.length > 0;

    const handleGenerate = () => {
        if (!teamId || !month) {
            return;
        }

        setLoading(true);
        router.post(
            ReportingActions.generate.url(),
            { month, team_id: teamId },
            {
                preserveScroll: true,
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <>
            <Head title="Reporting" />

            {loading && (
                <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                    <span className="text-sm text-slate-700">
                        Mengirim permintaan…
                    </span>
                </div>
            )}

            <div className="flex flex-1 flex-col gap-6">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(135deg,_#fffdf8,_#f8fafc_45%,_#eef6ff)] p-4 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-sky-700 backdrop-blur">
                                <FileBarChart2 className="h-3.5 w-3.5" />
                                Reporting Bulanan Task
                            </div>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                                Insight per bulan, per team, per orang.
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                                Report digenerate menggunakan word-matching terhadap
                                kolom Kanban. Skor: 10 (komentar + file), 6 (hanya komentar),
                                3 (step terlewati), 0 (tanpa evidence).
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-row lg:items-end">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-slate-700">
                                        Pilih bulan
                                    </span>
                                    <div className="relative">
                                        <CalendarRange className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="month"
                                            value={month}
                                            onChange={(event) =>
                                                setMonth(event.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 shadow-sm transition outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                                        />
                                    </div>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-slate-700">
                                        Team
                                    </span>
                                    <select
                                        value={teamId}
                                        onChange={(event) =>
                                            setTeamId(event.target.value)
                                        }
                                        disabled={!hasTeamOptions}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                                    >
                                        <option value="" disabled>Pilih team...</option>
                                        {!hasTeamOptions && (
                                            <option value="">
                                                Belum ada team dengan SOP
                                            </option>
                                        )}
                                        {teamOptions.map((team) => (
                                            <option
                                                key={team.id}
                                                value={team.id}
                                            >
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                                    <Button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={
                                            loading || !teamId || !month
                                        }
                                        className="w-full gap-2 rounded-xl lg:w-auto"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCcw className="h-4 w-4" />
                                        )}
                                        {loading ? 'Memproses…' : 'Generate Baru'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {(() => {
                    const generateError = (
                        usePage().props.errors as Record<string, string>
                    )?.generate;
                    return generateError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <span className="font-semibold">
                                Error generate:
                            </span>{' '}
                            {generateError}
                        </div>
                    ) : null;
                })()}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900">
                            Riwayat Generate Report
                        </h2>
                    </div>

                    {reports.data.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                                <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                                    <FileBarChart2 className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Belum Ada Report</h3>
                                <p className="text-sm text-slate-500">
                                    Mulai dengan memilih bulan dan team, lalu klik tombol "Generate Baru".
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Bulan</th>
                                        <th className="px-4 py-3 text-left font-medium">Team</th>
                                        <th className="px-4 py-3 text-left font-medium">Metode</th>
                                        <th className="px-4 py-3 text-left font-medium">Sumber Task</th>
                                        <th className="px-4 py-3 text-left font-medium">Digenerate Oleh</th>
                                        <th className="px-4 py-3 text-left font-medium">Waktu Generate</th>
                                        <th className="px-4 py-3 text-right font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.data.map((r) => (
                                        <tr key={r.id} className="transition-colors hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-900">{r.month}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.team?.name ?? '-'}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                                    Word Match
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{r.source_task_count} task</td>
                                            <td className="px-4 py-3 text-slate-600">{r.generator?.name ?? 'Sistem'}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.generated_at}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-full"
                                                    onClick={() => router.get(ReportingActions.show.url(r.id))}
                                                >
                                                    Detail
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
