import { Camera, ImageIcon, Loader2, RotateCcw, Check, X } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const CAMERA_TIMEOUT_MS = 10_000;

interface CapturedPhoto {
    blob: Blob;
    dataUrl: string;
    file: File;
}

interface CameraCaptureProps {
    onCapture: (files: File[]) => void;
    disabled?: boolean;
    maxPhotos?: number;
    currentCount?: number;
    label?: string;
}

function isSecureContext(): boolean {
    return typeof window !== 'undefined' && (
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );
}

export function CameraCapture({
    onCapture,
    disabled = false,
    maxPhotos = 5,
    currentCount = 0,
    label,
}: CameraCaptureProps) {
    const [open, setOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [captured, setCaptured] = useState<CapturedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);

    const canCapture = currentCount < maxPhotos;
    const hasCamera = isSecureContext() &&
        typeof navigator.mediaDevices?.getUserMedia === 'function';

    const startCamera = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const mediaStream = await Promise.race([
                navigator.mediaDevices!.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), CAMERA_TIMEOUT_MS),
                ),
            ]);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            if (err?.message === 'TIMEOUT') {
                setError('Kamera tidak merespon. Klik "Upload File" untuk pilih gambar.');
            } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setError('Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.');
            } else if (err?.name === 'NotFoundError') {
                setError('Kamera tidak ditemukan di perangkat ini.');
            } else {
                setError('Gagal mengakses kamera: ' + (err?.message || 'Coba gunakan Upload File.'));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    }, [stream]);

    const capturePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const timestamp = Date.now();
                const file = new File([blob], `photo_${timestamp}.jpg`, { type: 'image/jpeg' });
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCaptured((prev) => [...prev, { blob, dataUrl, file }]);
            },
            'image/jpeg',
            0.92,
        );
    }, []);

    const confirmPhotos = useCallback(() => {
        const files = captured.map((c) => c.file);
        onCapture(files);
        setCaptured([]);
        setOpen(false);
    }, [captured, onCapture]);

    const handleOpen = () => {
        setCaptured([]);
        setError(null);
        setOpen(true);
    };

    const handleClose = useCallback(() => {
        stopCamera();
        setCaptured([]);
        setError(null);
        setOpen(false);
    }, [stopCamera]);

    const handleFallbackFile = useCallback(() => {
        stopCamera();
        setOpen(false);
        setTimeout(() => fallbackInputRef.current?.click(), 150);
    }, [stopCamera]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onCapture(Array.from(e.target.files));
            e.target.value = '';
        }
    }, [onCapture]);

    useEffect(() => {
        if (open) startCamera();
        else stopCamera();
        return () => stopCamera();
    }, [open, startCamera, stopCamera]);

    const hasReachedMax = captured.length >= maxPhotos;

    // No camera support → fallback file input
    if (!hasCamera) {
        return (
            <div className="flex items-center gap-1">
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fallbackInputRef} onChange={handleFileChange} />
                <button type="button" onClick={() => fallbackInputRef.current?.click()} disabled={disabled || !canCapture}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
                    <Camera className="h-3.5 w-3.5" />
                    {label || 'Ambil Foto'}
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Hidden canvas for capture processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden fallback file input */}
            <input type="file" accept="image/*" className="hidden" ref={fallbackInputRef} onChange={handleFileChange} />

            <button type="button" onClick={handleOpen} disabled={disabled || !canCapture}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
                <Camera className="h-3.5 w-3.5" />
                {label || 'Ambil Foto'}
            </button>

            <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
                <DialogContent className="max-w-full sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Camera className="h-4 w-4" />
                            Ambil Foto
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {/* Preview area */}
                        <div className="relative overflow-hidden rounded-xl bg-black">
                            {/* Video selalu ter-render biar stream tetap aktif */}
                            <video ref={videoRef} autoPlay playsInline muted
                                className={`h-auto w-full object-contain ${captured.length > 0 && captured.length <= 1 ? 'invisible absolute' : ''}`}
                                style={captured.length > 0 && captured.length <= 1 ? { maxHeight: 0 } : { maxHeight: 280 }} />

                            {loading ? (
                                <div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-3 text-white">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm text-white/60">Mengakses kamera...</p>
                                </div>
                            ) : error ? (
                                <div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                                    <X className="h-8 w-8 text-red-400" />
                                    <p className="text-sm text-white">{error}</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={startCamera}
                                            className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                                            Coba Lagi
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleFallbackFile}
                                            className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                                            Upload File
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            {/* Tampilkan hasil foto di atas video */}
                            {captured.length > 0 && captured.length <= 1 && (
                                <img src={captured[captured.length - 1].dataUrl} alt="Hasil foto"
                                    className="absolute inset-0 h-full w-full object-contain"
                                    style={{ maxHeight: 280 }} />
                            )}
                        </div>

                        {/* Thumbnails */}
                        {captured.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {captured.map((photo, i) => (
                                    <div key={i} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-sidebar-border">
                                        <img src={photo.dataUrl} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => setCaptured((prev) => prev.filter((_, j) => j !== i))}
                                            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Controls */}
                        {!error && (
                            <div className="flex items-center justify-center gap-3">
                                {captured.length === 0 ? (
                                    <button type="button" onClick={capturePhoto} disabled={loading || !stream}
                                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-0 shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                                        title="Ambil foto">
                                        <div className="h-10 w-10 rounded-full border-2 border-black" />
                                    </button>
                                ) : (
                                    <>
                                        {!hasReachedMax && (
                                            <button type="button" onClick={capturePhoto}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700">
                                                <Camera className="h-3.5 w-3.5" />
                                                Ambil Lagi ({captured.length}/{maxPhotos})
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setCaptured([])}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700">
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Ulang
                                        </button>
                                        <button type="button" onClick={confirmPhotos}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                                            <Check className="h-3.5 w-3.5" />
                                            Gunakan ({captured.length})
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
