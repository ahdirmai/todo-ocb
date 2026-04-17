import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher;

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY as string,
        wsHost:
            import.meta.env.VITE_REVERB_HOST === '127.0.0.1'
                ? window.location.hostname
                : (import.meta.env.VITE_REVERB_HOST as string),
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        scheme: (import.meta.env.VITE_REVERB_SCHEME as string) ?? 'http',
        forceTLS:
            ((import.meta.env.VITE_REVERB_SCHEME as string) ?? 'http') ===
            'https',
        enabledTransports: ['ws', 'wss'],
    });
}
