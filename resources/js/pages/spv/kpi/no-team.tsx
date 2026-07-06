import KpiLayout from '@/layouts/kpi-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Head } from '@inertiajs/react';
import { Eye, AlertCircle } from 'lucide-react';

interface Props {
    message: string;
}

export default function SpvNoTeam({ message }: Props) {
    return (
        <KpiLayout area="spv">
            <Head title="SPV — Belum Terdaftar" />

            <div className="mx-auto max-w-2xl">
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                            <Eye className="h-8 w-8 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-semibold">Belum Terdaftar dalam Tim SPV</h1>
                            <p className="text-amber-800 dark:text-amber-200">{message}</p>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-900/40 pt-4">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>
                                Hubungi admin (superadmin) untuk di-assign ke tim SPV.
                                Atau gunakan halaman <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">/rbac</code>{' '}
                                untuk cek apakah posisi & permission Anda sudah benar.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </KpiLayout>
    );
}
