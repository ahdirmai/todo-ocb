import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type SurveyData = {
    experience: number;
    usage_duration: string;
    most_used_features: string[];
    most_helpful_feature: string;
    technical_issues: string[];
    other_issue: string;
    data_loss: string;
    desired_features: string[];
    custom_feature_request: string;
    suggestions: string;
};

type Cycle = {
    id: number;
    title: string;
    description: string | null;
};

type Props = {
    survey: { id: number; survey_data: SurveyData; created_at: string } | null;
    message: string | null;
    cycle: Cycle | null;
};

const FEATURE_OPTIONS = [
    { value: 'dashboard', label: 'Dashboard / melihat tugas harian' },
    { value: 'upload', label: 'Upload bukti tugas (komentar + lampiran foto)' },
    { value: 'report', label: 'Laporan harian (khusus Manajer)' },
    { value: 'monitoring', label: 'Monitoring tim SPV (khusus CEO)' },
    { value: 'store', label: 'Data store / kunjungan toko (khusus SPV)' },
];

const ISSUE_OPTIONS = [
    { value: 'none', label: 'Tidak ada' },
    { value: 'slow', label: 'Aplikasi lambat / lemot' },
    { value: 'error', label: 'Sering error / tiba-tiba tidak bisa diakses' },
    { value: 'mobile', label: 'Tampilan sulit dipahami di HP' },
    { value: 'upload', label: 'Sulit upload foto / lampiran' },
];

const DESIRED_FEATURES = [
    { value: 'notif-wa', label: 'Notifikasi/reminder otomatis via WhatsApp' },
    { value: 'rekap-pdf', label: 'Rekap otomatis laporan bulanan (PDF/Excel)' },
    { value: 'mobile-app', label: 'Aplikasi mobile Android (bukan web)' },
    { value: 'grafik', label: 'Grafik dan visualisasi data yang lebih interaktif' },
    { value: 'chat', label: 'Fitur chat antar user' },
    { value: 'absensi', label: 'Absensi / check-in harian via aplikasi' },
];

export default function SurveyIndex() {
    const { survey, message, cycle } = usePage<Props>().props;

    const [experience, setExperience] = useState(0);
    const [usageDuration, setUsageDuration] = useState('');
    const [mostUsedFeatures, setMostUsedFeatures] = useState<string[]>([]);
    const [mostHelpfulFeature, setMostHelpfulFeature] = useState('');
    const [technicalIssues, setTechnicalIssues] = useState<string[]>([]);
    const [otherIssue, setOtherIssue] = useState('');
    const [dataLoss, setDataLoss] = useState('');
    const [desiredFeatures, setDesiredFeatures] = useState<string[]>([]);
    const [customFeatureRequest, setCustomFeatureRequest] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!cycle) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Tidak Ada Survey</CardTitle>
                        <CardDescription>{message || 'Belum ada sesi survey yang dibuka.'}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (survey) {
        return (
            <div className="container mx-auto max-w-2xl py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Survey Sudah Diisi</CardTitle>
                        <CardDescription>
                            Anda sudah mengisi survey "{cycle.title}" pada {survey.created_at}.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    function toggleArray(arr: string[], value: string): string[] {
        if (arr.includes(value)) {
            return arr.filter((v) => v !== value);
        }
        return [...arr, value];
    }

    function handleSubmit() {
        if (!experience) {
            setError('Pilih pengalaman Anda menggunakan aplikasi.');
            return;
        }
        if (!usageDuration) {
            setError('Pilih lama penggunaan aplikasi.');
            return;
        }

        setError(null);
        setSaving(true);

        router.post('/survey', {
            experience,
            usage_duration: usageDuration,
            most_used_features: mostUsedFeatures.length > 0 ? mostUsedFeatures : null,
            most_helpful_feature: mostHelpfulFeature || null,
            technical_issues: technicalIssues.length > 0 ? technicalIssues : null,
            other_issue: otherIssue || null,
            data_loss: dataLoss || null,
            desired_features: desiredFeatures.length > 0 ? desiredFeatures : null,
            custom_feature_request: customFeatureRequest || null,
            suggestions: suggestions || null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                setError(null);
                toast.success('Terima kasih! Survey Anda sudah kami terima.');
            },
            onError: (errors) => {
                setError(Object.values(errors).join('\n'));
                setSaving(false);
            },
        });
    }

    return (
        <div className="container mx-auto max-w-2xl py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{cycle.title}</h1>
                {cycle.description && <p className="mt-1 text-muted-foreground">{cycle.description}</p>}
            </div>

            {error && (
                <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-6">
                {/* Identity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Identitas Pengguna</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Sudah berapa lama pakai aplikasi ini?</Label>
                            <div className="flex gap-4">
                                {[
                                    { value: '<1', label: '< 1 bulan' },
                                    { value: '1-3', label: '1-3 bulan' },
                                    { value: '>3', label: '> 3 bulan' },
                                ].map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="usage_duration"
                                            value={opt.value}
                                            checked={usageDuration === opt.value}
                                            onChange={(e) => setUsageDuration(e.target.value)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Experience */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kesan Umum</CardTitle>
                        <CardDescription>Secara keseluruhan, bagaimana pengalaman Anda?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Pengalaman</Label>
                            <div className="flex gap-4">
                                {[
                                    { value: 5, label: 'Sangat puas' },
                                    { value: 4, label: 'Puas' },
                                    { value: 3, label: 'Cukup' },
                                    { value: 2, label: 'Kurang puas' },
                                    { value: 1, label: 'Tidak puas' },
                                ].map((opt) => (
                                    <label key={opt.value} className="flex cursor-pointer flex-col items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setExperience(opt.value)}
                                            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-colors ${
                                                experience === opt.value
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {opt.value}
                                        </button>
                                        <span className="text-xs text-muted-foreground">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fitur yang paling sering digunakan (boleh pilih lebih dari 1)</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {FEATURE_OPTIONS.map((opt) => (
                                    <label key={opt.value} className="flex items-start gap-2 rounded-md border p-3 hover:bg-accent/50">
                                        <input
                                            type="checkbox"
                                            checked={mostUsedFeatures.includes(opt.value)}
                                            onChange={() => setMostUsedFeatures(toggleArray(mostUsedFeatures, opt.value))}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Apa fitur yang paling membantu pekerjaan Anda?</Label>
                            <Textarea
                                value={mostHelpfulFeature}
                                onChange={(e) => setMostHelpfulFeature(e.target.value)}
                                placeholder="Jelaskan..."
                                rows={3}
                                maxLength={2000}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Issues */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kendala & Masalah</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Kendala teknis yang sering dialami (boleh pilih lebih dari 1)</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {ISSUE_OPTIONS.map((opt) => (
                                    <label key={opt.value} className="flex items-start gap-2 rounded-md border p-3 hover:bg-accent/50">
                                        <input
                                            type="checkbox"
                                            checked={technicalIssues.includes(opt.value)}
                                            onChange={() => setTechnicalIssues(toggleArray(technicalIssues, opt.value))}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Kendala lain yang mengganggu (opsional)</Label>
                            <Textarea
                                value={otherIssue}
                                onChange={(e) => setOtherIssue(e.target.value)}
                                placeholder="Jelaskan..."
                                rows={3}
                                maxLength={2000}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Pernah kehilangan data?</Label>
                            <div className="flex gap-4">
                                {[
                                    { value: 'tidak', label: 'Tidak pernah' },
                                    { value: '1-2', label: 'Pernah 1-2 kali' },
                                    { value: 'sering', label: 'Sering' },
                                ].map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="data_loss"
                                            value={opt.value}
                                            checked={dataLoss === opt.value}
                                            onChange={(e) => setDataLoss(e.target.value)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Feature Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Fitur yang Diinginkan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Fitur apa yang paling penting? (pilih 1-3)</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {DESIRED_FEATURES.map((opt) => (
                                    <label key={opt.value} className="flex items-start gap-2 rounded-md border p-3 hover:bg-accent/50">
                                        <input
                                            type="checkbox"
                                            checked={desiredFeatures.includes(opt.value)}
                                            onChange={() => setDesiredFeatures(toggleArray(desiredFeatures, opt.value))}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fitur lain yang belum ada tapi sangat dibutuhkan (opsional)</Label>
                            <Textarea
                                value={customFeatureRequest}
                                onChange={(e) => setCustomFeatureRequest(e.target.value)}
                                placeholder="Jelaskan..."
                                rows={3}
                                maxLength={2000}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Suggestions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Saran & Masukan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Apa satu hal yang akan Anda ubah dari aplikasi ini?</Label>
                            <Textarea
                                value={suggestions}
                                onChange={(e) => setSuggestions(e.target.value)}
                                placeholder="Jelaskan..."
                                rows={4}
                                maxLength={5000}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => window.history.back()} disabled={saving}>
                        Kembali
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving} size="lg">
                        {saving ? 'Mengirim...' : 'Kirim Survey'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
