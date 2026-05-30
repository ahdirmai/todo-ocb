import { Head, setLayoutProps } from '@inertiajs/react';
import { Users } from 'lucide-react';

export default function HrIndex() {
    setLayoutProps({
        breadcrumbs: [{ title: 'HR Area', href: '/hr' }],
    });

    return (
        <>
            <Head title="HR Area" />

            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed bg-card p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="mb-2 text-2xl font-bold">HR Area</h1>
                        <p className="text-muted-foreground">
                            Area khusus untuk manajemen Human Resources. Konten
                            akan segera ditambahkan.
                        </p>
                    </div>
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            🚧 Halaman ini masih dalam tahap pengembangan
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
