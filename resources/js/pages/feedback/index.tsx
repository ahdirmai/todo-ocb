import { Head, router, usePage } from '@inertiajs/react';
import { Download, Plus, X, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Cycle {
    id: number;
    title: string | null;
    description: string | null;
    is_open: boolean;
    opened_at: string;
    closed_at: string | null;
    feedback_count: number;
    created_by: string | null;
}

interface SurveyData {
    experience: number;
    usage_duration: string | null;
    most_used_features: string[] | null;
    most_helpful_feature: string | null;
    technical_issues: string[] | null;
    other_issue: string | null;
    data_loss: string | null;
    desired_features: string[] | null;
    custom_feature_request: string | null;
    suggestions: string | null;
}

interface FeedbackItem {
    id: number;
    cycle_id: number;
    user: {
        id: number;
        name: string;
        email: string;
        position: string | null;
    } | null;
    category: string | null;
    subject: string;
    message: string;
    rating: number | null;
    survey_data: SurveyData | null;
    is_survey: boolean;
    created_at: string;
}

interface PageProps {
    [key: string]: unknown;
    activeCycle: Cycle | null;
    cycles: Cycle[];
    feedback: FeedbackItem[];
}

const USAGE_LABELS: Record<string, string> = {
    '<1': '< 1 bulan',
    '1-3': '1-3 bulan',
    '>3': '> 3 bulan',
};

const FEATURE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard / tugas harian',
    upload: 'Upload bukti tugas',
    report: 'Laporan harian',
    monitoring: 'Monitoring SPV',
    store: 'Kunjungan toko',
};

const ISSUE_LABELS: Record<string, string> = {
    none: 'Tidak ada',
    slow: 'Aplikasi lambat / lemot',
    error: 'Sering error',
    mobile: 'Sulit di HP',
    upload: 'Sulit upload',
};

const DATA_LOSS_LABELS: Record<string, string> = {
    tidak: 'Tidak pernah',
    '1-2': 'Pernah 1-2 kali',
    sering: 'Sering',
};

const DESIRED_FEATURE_LABELS: Record<string, string> = {
    'notif-wa': 'Notifikasi WhatsApp',
    'rekap-pdf': 'Rekap bulanan PDF/Excel',
    'mobile-app': 'Aplikasi Android',
    grafik: 'Grafik interaktif',
    chat: 'Chat antar user',
    absensi: 'Absensi harian',
};

function RatingStars({ rating }: { rating: number | null }) {
    if (!rating) return null;
    return (
        <span className="text-yellow-500">
            {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </span>
    );
}

function SurveyDetail({ data }: { data: SurveyData }) {
    return (
        <div className="space-y-4 text-sm">
            <Section label="Pengalaman" value={`${data.experience}/5`} />
            <Section label="Lama Pemakaian" value={USAGE_LABELS[data.usage_duration ?? ''] ?? '-'} />
            <Section label="Fitur Sering Digunakan" value={data.most_used_features?.map((f) => FEATURE_LABELS[f] ?? f).join(', ') ?? '-'} />
            <Section label="Fitur Paling Membantu" value={data.most_helpful_feature ?? '-'} />
            <Section label="Kendala Teknis" value={data.technical_issues?.map((i) => ISSUE_LABELS[i] ?? i).join(', ') ?? '-'} />
            <Section label="Kendala Lain" value={data.other_issue ?? '-'} />
            <Section label="Kehilangan Data" value={DATA_LOSS_LABELS[data.data_loss ?? ''] ?? '-'} />
            <Section label="Fitur Diinginkan" value={data.desired_features?.map((f) => DESIRED_FEATURE_LABELS[f] ?? f).join(', ') ?? '-'} />
            <Section label="Request Fitur Lain" value={data.custom_feature_request ?? '-'} />
            <Section label="Saran" value={data.suggestions ?? '-'} />
        </div>
    );
}

function Section({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
            <dd className="whitespace-pre-wrap mt-0.5">{value}</dd>
        </div>
    );
}

export default function FeedbackIndex() {
    const { activeCycle, cycles, feedback } = usePage<PageProps>().props;
    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState<FeedbackItem | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    function handleOpenCycle() {
        if (!title.trim()) return;
        setSaving(true);
        router.post('/admin/feedback/open', {
            title,
            description,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setTitle('');
                setDescription('');
                setOpenCreate(false);
                toast.success('Sesi feedback berhasil dibuka');
                setSaving(false);
            },
            onError: () => { setSaving(false); },
        });
    }

    function handleCloseCycle(cycleId: number) {
        router.post(`/admin/feedback/${cycleId}/close`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Sesi feedback ditutup'),
        });
    }

    return (
        <>
            <Head title="Feedback" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Feedback</h1>
                    <p className="text-muted-foreground">Kelola sesi feedback dan lihat masukan dari pengguna</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.location.href = '/admin/feedback/export'}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    <Button onClick={() => setOpenCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Buka Sesi Baru
                    </Button>
                </div>
            </div>

            {activeCycle && (
                <Card className="mb-6 border-primary/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-600">Aktif</Badge>
                                <CardTitle className="text-lg">{activeCycle.title}</CardTitle>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleCloseCycle(activeCycle.id)}>
                                <X className="mr-1 h-4 w-4" /> Tutup Sesi
                            </Button>
                        </div>
                        {activeCycle.description && (
                            <CardDescription>{activeCycle.description}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dibuka: {activeCycle.opened_at} &middot; Feedback masuk:{' '}
                            {cycles.find((c) => c.id === activeCycle.id)?.feedback_count ?? 0}
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Sesi</CardTitle>
                </CardHeader>
                <CardContent>
                    {cycles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada sesi feedback.</p>
                    ) : (
                        <div className="space-y-2">
                            {cycles.map((cycle) => (
                                <div key={cycle.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{cycle.title ?? `Sesi #${cycle.id}`}</span>
                                            {cycle.is_open && <Badge variant="outline" className="text-green-600 border-green-600">Aktif</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {cycle.feedback_count} feedback &middot; Dibuka {cycle.opened_at} oleh {cycle.created_by}
                                            {cycle.closed_at ? ` &middot; Ditutup ${cycle.closed_at}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Semua Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    {feedback.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada feedback.</p>
                    ) : (
                        <div className="space-y-3">
                            {feedback.map((item) => (
                                <div
                                    key={item.id}
                                    className="cursor-pointer rounded-md border p-4 transition-colors hover:bg-accent/50"
                                    onClick={() => setOpenDetail(item)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{item.subject}</span>
                                                {item.is_survey && (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">Survey</Badge>
                                                )}
                                                {item.category && !item.is_survey && (
                                                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0 ml-4">
                                            <span>{item.user?.name ?? 'Anonim'}</span>
                                            <span>{item.user?.position ?? ''}</span>
                                            <RatingStars rating={item.rating} />
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.created_at}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Open Cycle Dialog */}
            <Dialog open={openCreate} onOpenChange={(v) => { if (!v) { setOpenCreate(false); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buka Sesi Feedback Baru</DialogTitle>
                        <DialogDescription>
                            Saat sesi aktif, semua pengguna akan melihat tombol survey mengambang di pojok kanan bawah.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Judul</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Contoh: Sesi Survey Juni 2026"
                                maxLength={200}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Deskripsi (opsional)</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Informasi tambahan untuk pengguna..."
                                rows={3}
                                maxLength={1000}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
                        <Button onClick={handleOpenCycle} disabled={saving || !title.trim()}>
                            {saving ? 'Membuka...' : 'Buka Sesi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Feedback Detail Dialog */}
            <Dialog open={!!openDetail} onOpenChange={(v) => { if (!v) setOpenDetail(null); }}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    {openDetail && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <DialogTitle>{openDetail.subject}</DialogTitle>
                                    {openDetail.is_survey && (
                                        <Badge variant="outline" className="text-blue-600 border-blue-600">Survey</Badge>
                                    )}
                                    {openDetail.category && !openDetail.is_survey && (
                                        <Badge variant="secondary">{openDetail.category}</Badge>
                                    )}
                                </div>
                                <DialogDescription>
                                    Dari {openDetail.user?.name ?? 'Anonim'} &middot; {openDetail.user?.position ?? ''} &middot; {openDetail.created_at}
                                    <RatingStars rating={openDetail.rating} />
                                </DialogDescription>
                            </DialogHeader>

                            {openDetail.is_survey && openDetail.survey_data ? (
                                <div className="py-2">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium text-muted-foreground">Detail Survey</span>
                                    </div>
                                    <SurveyDetail data={openDetail.survey_data} />
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap text-sm">{openDetail.message}</p>
                            )}
                        </>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDetail(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
