import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo?: Echo<'pusher'>;
    }
}

function createEcho(): Echo<'pusher'> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const key = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined;

    if (!key) {
        console.warn('[Echo] VITE_PUSHER_APP_KEY belum tersedia.');

        return null;
    }

    window.Pusher = Pusher;

    return new Echo({
        broadcaster: 'pusher',
        key,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER as string,
        wsHost: (import.meta.env.VITE_PUSHER_HOST as string | undefined) || undefined,
        wsPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 80),
        wssPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 443),
        forceTLS:
            (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
    });
}

export function getEcho(): Echo<'pusher'> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!window.Echo) {
        window.Echo = createEcho() ?? undefined;
    }

    return window.Echo ?? null;
}

if (typeof window !== 'undefined') {
    getEcho();
}
