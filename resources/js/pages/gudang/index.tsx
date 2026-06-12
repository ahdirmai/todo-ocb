import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { BarChart3, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    positionName: string | null;
    isMonitoring: boolean;
    gudangPositions: string[];
}

const POSITION_INFO: Record<string, { division: string; description: string }> = {
    'Gudang BJB': {
        division: 'Divisi A',
        description: 'Operasional server, gesekan Otto, setoran & voucher (Banjarbaru)',
    },
    'Gudang BJM': {
        division: 'Divisi B',
        description: 'Pengisian operator toko, gesekan Otto, setoran bank (Banjarmasin)',
    },
    'Gudang Gesekan': {
        division: 'Divisi C',
        description: 'Produktivitas gesekan: target 1.500 pcs, invalid < 0,5%',
    },
    'Gudang ACC': {
        division: 'Divisi D',
        description: 'Distribusi aksesoris: min. 8 toko/hari, pengantaran 1x24 jam',
    },
};

export default function GudangIndex({ positionName, isMonitoring, gudangPositions }: Props) {
    setLayoutProps({
        breadcrumbs: [{ title: 'Gudang Area', href: '/gudang' }],
    });

    return (
        <>
            <Head title="Gudang Area" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed bg-card p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Warehouse className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="mb-2 text-2xl font-bold">Gudang Area</h1>
                        <p className="text-muted-foreground">
                            {isMonitoring
                                ? 'Monitoring divisi gudang — pilih posisi untuk melihat KPI'
                                : positionName
                                  ? `Area khusus untuk posisi ${positionName}`
                                  : 'Area khusus untuk divisi gudang'}
                        </p>
                    </div>
                </div>

                {isMonitoring ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {gudangPositions.map((position) => {
                            const info = POSITION_INFO[position];
                            return (
                                <Card key={position}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5" />
                                            {position}
                                        </CardTitle>
                                        <CardDescription>
                                            {info ? `${info.division} — ${info.description}` : position}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Link
                                            href={`/gudang/kpi/dashboard?position=${encodeURIComponent(position)}`}
                                        >
                                            <Button className="w-full">Buka KPI {position}</Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    KPI Dashboard
                                </CardTitle>
                                <CardDescription>
                                    Monitoring evaluasi kinerja harian divisi gudang
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/gudang/kpi/dashboard">
                                    <Button className="w-full">Buka KPI Dashboard</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="opacity-50">
                            <CardHeader>
                                <CardTitle>Fitur Lainnya</CardTitle>
                                <CardDescription>
                                    Fitur gudang lainnya akan segera ditambahkan
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full" disabled>Coming Soon</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}
