import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            uploads: {
                documents: {
                    maxFileKb: number;
                    maxAttachments: number;
                    allowedMimes: string[];
                };
            };
            [key: string]: unknown;
        };
    }
}
