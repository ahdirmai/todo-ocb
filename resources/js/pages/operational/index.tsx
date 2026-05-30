import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OperationalIndex() {
    setLayoutProps({
        breadcrumbs: [{ title: 'Operational Area', href: '/operational' }],
    });

    return (
        <>
            <Head title="Operational Area" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed bg-card p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Settings className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="mb-2 text-2xl font-bold">
                            Operational Area
                        </h1>
                        <p className="text-muted-foreground">
                            Area khusus untuk Manager Operasional
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                KPI Dashboard
                            </CardTitle>
                            <CardDescription>
                                Monitoring evaluasi kinerja harian Manager Operasional
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/operational/kpi/dashboard">
                                <Button className="w-full">Buka KPI Dashboard</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="opacity-50">
                        <CardHeader>
                            <CardTitle>Fitur Lainnya</CardTitle>
                            <CardDescription>
                                Fitur operational lainnya akan segera ditambahkan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" disabled>Coming Soon</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
