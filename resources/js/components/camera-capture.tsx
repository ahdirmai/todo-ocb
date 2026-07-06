import { Camera } from 'lucide-react';
import { useRef, useCallback } from 'react';

interface CameraCaptureProps {
    onCapture: (files: File[]) => void;
    disabled?: boolean;
    currentCount?: number;
    label?: string;
}

export function CameraCapture({
    onCapture,
    disabled = false,
    currentCount = 0,
    label,
}: CameraCaptureProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onCapture(Array.from(e.target.files));
            e.target.value = '';
        }
    }, [onCapture]);

    return (
        <div className="flex items-center gap-1">
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={inputRef}
                onChange={handleChange}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                    disabled
                        ? 'cursor-not-allowed text-muted-foreground/50'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
                <Camera className="h-3.5 w-3.5" />
                {label || 'Ambil Foto'}
                {currentCount > 0 && (
                    <span className="ml-0.5 text-[10px] text-primary">({currentCount})</span>
                )}
            </button>
        </div>
    );
}
