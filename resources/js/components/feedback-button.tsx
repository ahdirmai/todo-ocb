import { router } from '@inertiajs/react';
import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function FeedbackButton() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(0);
    const [error, setError] = useState<string | null>(null);

    function handleSubmit() {
        if (!subject.trim() || !message.trim()) {
            setError('Subjek dan pesan harus diisi.');
            return;
        }
        setError(null);
        setSaving(true);

        router.post('/feedback', {
            category,
            subject,
            message,
            rating: rating > 0 ? rating : null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSubject('');
                setMessage('');
                setCategory('');
                setRating(0);
                setOpen(false);
                toast.success('Terima kasih! Feedback Anda sudah kami terima.');
                setSaving(false);
            },
            onError: (errors) => {
                setError(Object.values(errors).join('\n'));
                setSaving(false);
            },
        });
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                aria-label="Kirim Feedback"
            >
                <MessageSquarePlus className="h-6 w-6" />
            </button>

            <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setError(null); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Kirim Feedback</DialogTitle>
                        <DialogDescription>
                            Laporkan bug, minta fitur, atau beri saran perbaikan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori (opsional)</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Pilih kategori...</option>
                                <option value="bug">Bug / Error</option>
                                <option value="feature">Permintaan Fitur</option>
                                <option value="improvement">Saran Perbaikan</option>
                                <option value="ui">Tampilan / UI</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subjek <span className="text-destructive">*</span></Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Judul singkat feedback Anda"
                                maxLength={200}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Pesan <span className="text-destructive">*</span></Label>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Jelaskan feedback Anda di sini..."
                                rows={5}
                                maxLength={5000}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Rating (opsional)</Label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star === rating ? 0 : star)}
                                        className={`h-8 w-8 rounded-full text-lg transition-colors ${
                                            star <= rating ? 'text-yellow-500' : 'text-muted-foreground/30'
                                        }`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Mengirim...' : 'Kirim Feedback'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
