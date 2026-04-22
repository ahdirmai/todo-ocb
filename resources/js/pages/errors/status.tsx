import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Compass,
    Home,
    Lock,
    RefreshCw,
    ServerCrash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AppLogo from '@/components/app-logo';
import { dashboard, home, login } from '@/routes';

type ErrorPageProps = {
    status: number;
    auth?: {
        user?: {
            id: number;
            name: string;
        } | null;
    };
};

const statusMap: Record<number, {
    label: string;
    title: string;
    description: string;
    accent: string;
    badge: string;
    panel: string;
    icon: typeof Lock;
}> = {
    403: {
        label: 'Akses Dibatasi',
        title: 'Halaman ini tidak terbuka untuk akun Anda.',
        description: 'Biasanya ini terjadi karena Anda belum punya akses ke tim atau resource yang sedang dibuka.',
        accent: 'text-amber-600 dark:text-amber-300',
        badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
        panel: 'from-amber-100 via-white to-slate-100 dark:from-amber-950/30 dark:via-zinc-950 dark:to-zinc-900',
        icon: Lock,
    },
    404: {
        label: 'Tidak Ditemukan',
        title: 'Tujuan yang Anda cari sudah pindah atau memang tidak ada.',
        description: 'Periksa kembali tautan yang dibuka, atau kembali ke dashboard untuk melanjutkan pekerjaan dari halaman yang valid.',
        accent: 'text-sky-600 dark:text-sky-300',
        badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
        panel: 'from-sky-100 via-white to-slate-100 dark:from-sky-950/30 dark:via-zinc-950 dark:to-zinc-900',
        icon: Compass,
    },
    500: {
        label: 'Gangguan Sistem',
        title: 'Ada sesuatu yang gagal diproses di sisi server.',
        description: 'Permintaan Anda tidak hilang, tetapi aplikasi sedang butuh retry. Coba muat ulang beberapa saat lagi.',
        accent: 'text-rose-600 dark:text-rose-300',
        badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
        panel: 'from-rose-100 via-white to-slate-100 dark:from-rose-950/30 dark:via-zinc-950 dark:to-zinc-900',
        icon: ServerCrash,
    },
    503: {
        label: 'Sedang Perawatan',
        title: 'Aplikasi sedang tidak tersedia untuk sementara.',
        description: 'Kemungkinan ada maintenance atau deploy yang sedang berjalan. Silakan coba lagi dalam beberapa menit.',
        accent: 'text-violet-600 dark:text-violet-300',
        badge: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
        panel: 'from-violet-100 via-white to-slate-100 dark:from-violet-950/30 dark:via-zinc-950 dark:to-zinc-900',
        icon: AlertTriangle,
    },
};

export default function ErrorStatusPage({ status }: ErrorPageProps) {
    const { auth } = usePage<ErrorPageProps>().props;
    const config = statusMap[status] ?? statusMap[500];
    const Icon = config.icon;
    const primaryHref = auth?.user ? dashboard() : home();
    const primaryLabel = auth?.user ? 'Kembali ke Dashboard' : 'Kembali ke Beranda';

    return (
        <>
            <Head title={`${status} ${config.label}`} />

            <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(241,245,249,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_28%),linear-gradient(180deg,_rgba(9,9,11,1)_0%,_rgba(15,23,42,1)_100%)]">
                <div className="absolute inset-0 opacity-60">
                    <div className="absolute top-24 left-[10%] h-40 w-40 rounded-full bg-white/60 blur-3xl dark:bg-white/5" />
                    <div className="absolute right-[8%] bottom-16 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-400/10" />
                </div>

                <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
                    <div className="mb-10 flex items-center justify-between">
                        <Link href={home()} className="inline-flex items-center">
                            <AppLogo />
                        </Link>

                        <Badge className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase ${config.badge}`}>
                            Error {status}
                        </Badge>
                    </div>

                    <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="max-w-2xl">
                            <p className={`mb-4 text-sm font-semibold tracking-[0.24em] uppercase ${config.accent}`}>
                                {config.label}
                            </p>
                            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
                                {config.title}
                            </h1>
                            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                                {config.description}
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button asChild size="lg" className="rounded-full px-6">
                                    <Link href={primaryHref}>
                                        <Home className="mr-2 h-4 w-4" />
                                        {primaryLabel}
                                    </Link>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="rounded-full border-slate-300 bg-white/80 px-6 text-slate-700 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-slate-100 dark:hover:bg-zinc-900"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Kembali
                                </Button>

                                {!auth?.user && status === 403 && (
                                    <Button asChild variant="ghost" size="lg" className="rounded-full px-5">
                                        <Link href={login()}>
                                            Masuk dengan akun lain
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Card className={`overflow-hidden border-sidebar-border/70 bg-gradient-to-br ${config.panel} shadow-2xl shadow-slate-900/10 dark:border-zinc-800 dark:shadow-black/30`}>
                            <CardContent className="relative p-6 sm:p-8">
                                <div className="absolute top-0 right-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-white/60 blur-2xl dark:bg-white/10" />

                                <div className="relative">
                                    <div className={`mb-6 inline-flex rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 ${config.accent}`}>
                                        <Icon className="h-8 w-8" />
                                    </div>

                                    <div className="mb-6 flex items-end gap-3">
                                        <span className="text-7xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-slate-50">
                                            {status}
                                        </span>
                                        <span className="pb-3 text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                                            System Response
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-white/10 dark:bg-zinc-950/60">
                                            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                                                Ringkasan
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                                                Aplikasi menahan permintaan ini agar alur kerja tetap aman dan konsisten.
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-dashed border-slate-300/80 p-4 dark:border-zinc-700">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                                <RefreshCw className="h-4 w-4" />
                                                Langkah cepat
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                                Coba buka dari navigasi utama atau ulangi aksi setelah memastikan akun Anda punya akses yang sesuai.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
