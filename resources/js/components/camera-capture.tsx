import { Camera, ImageIcon, Loader2, RotateCcw, Check, X } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface CapturedPhoto {
    blob: Blob;
    dataUrl: string;
    file: File;
}

interface CameraCaptureProps {
    onCapture: (files: File[]) => void;
    disabled?: boolean;
    /** Max number of photos allowed. Default 5. */
    maxPhotos?: number;
    currentCount?: number;
    label?: string;
    /** Accept string for fallback file input. Default "image/*" */
    accept?: string;
}

/** Check if the MediaDevices API is available (secure context: HTTPS or localhost). */
function isMediaDevicesSupported(): boolean {
    return typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
}

export function CameraCapture({
    onCapture,
    disabled = false,
    maxPhotos = 5,
    currentCount = 0,
    label,
    accept = 'image/*',
}: CameraCaptureProps) {
    const [open, setOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [captured, setCaptured] = useState<CapturedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);

    const canCapture = currentCount < maxPhotos;

    // Check camera support on mount
    useEffect(() => {
        setCameraSupported(isMediaDevicesSupported());
    }, []);

    const startCamera = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices!.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setError('Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.');
            } else if (err?.name === 'NotFoundError') {
                setError('Kamera tidak ditemukan di perangkat ini.');
            } else {
                setError('Gagal mengakses kamera: ' + (err?.message || 'Unknown error'));
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

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
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

    const retake = useCallback(() => {
        setCaptured([]);
    }, []);

    const removePhoto = useCallback((index: number) => {
        setCaptured((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const confirmPhotos = useCallback(() => {
        const files = captured.map((c) => c.file);
        onCapture(files);
        setCaptured([]);
        setOpen(false);
    }, [captured, onCapture]);

    const handleOpen = useCallback(() => {
        setCaptured([]);
        setError(null);
        setOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        stopCamera();
        setCaptured([]);
        setError(null);
        setOpen(false);
    }, [stopCamera]);

    const handleFallbackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onCapture(Array.from(e.target.files));
            e.target.value = '';
        }
    }, [onCapture]);

    // Start camera when dialog opens
    useEffect(() => {
        if (open) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [open, startCamera, stopCamera]);

    const hasReachedMax = captured.length >= maxPhotos;

    // If MediaDevices API is not available, show fallback file input
    if (cameraSupported === false) {
        return (
            <div className="flex items-center gap-1">
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    ref={fallbackInputRef}
                    onChange={handleFallbackChange}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex h-7 items-center gap-1 text-xs text-muted-foreground"
                    onClick={() => fallbackInputRef.current?.click()}
                    disabled={disabled || !canCapture}
                >
                    <ImageIcon className="h-3.5 w-3.5" />{' '}
                    {label || 'Ambil Foto'}
                </Button>
            </div>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex h-7 items-center gap-1 text-xs text-muted-foreground"
                onClick={handleOpen}
                disabled={disabled || !canCapture}
            >
                <Camera className="h-3.5 w-3.5" />{' '}
                {label || 'Ambil Foto'}
            </Button>

            <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
                <DialogContent className="max-w-full sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Ambil Foto
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {/* Camera Preview / Captured Preview */}
                        <div className="relative overflow-hidden rounded-xl bg-black">
                            {loading ? (
                                <div className="flex h-[300px] items-center justify-center text-white">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="flex h-[300px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white">
                                    <X className="h-8 w-8 text-red-400" />
                                    <p>{error}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={startCamera}
                                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                    >
                                        Coba Lagi
                                    </Button>
                                </div>
                            ) : captured.length > 0 && captured.length <= 1 ? (
                                <img
                                    src={captured[captured.length - 1].dataUrl}
                                    alt="Captured photo"
                                    className="h-auto max-h-[300px] w-full object-contain"
                                />
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="h-auto max-h-[300px] w-full object-contain"
                                />
                            )}
                        </div>

                        {/* Captured photos thumbnails */}
                        {captured.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {captured.map((photo, i) => (
                                    <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-sidebar-border">
                                        <img src={photo.dataUrl} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(i)}
                                            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        >
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
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="h-14 w-14 rounded-full p-0"
                                        onClick={capturePhoto}
                                        disabled={loading || !stream}
                                        title="Ambil foto"
                                    >
                                        <div className="h-10 w-10 rounded-full border-2 border-white" />
                                    </Button>
                                ) : (
                                    <>
                                        {!hasReachedMax && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={capturePhoto}
                                                className="gap-2"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Ambil Lagi ({captured.length}/{maxPhotos})
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={retake}
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Ulang
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={confirmPhotos}
                                            className="gap-2"
                                        >
                                            <Check className="h-4 w-4" />
                                            Gunakan ({captured.length})
                                        </Button>
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
