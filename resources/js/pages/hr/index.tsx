import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HrIndex() {
    setLayoutProps({
        breadcrumbs: [{ title: 'HR Area', href: '/hr' }],
    });

    return (
        <>
            <Head title="HR Area" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed bg-card p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="mb-2 text-2xl font-bold">HR Area</h1>
                        <p className="text-muted-foreground">
                            Area khusus untuk Manager HR
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
                                Monitoring evaluasi kinerja harian Manager HR
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/hr/kpi/dashboard">
                                <Button className="w-full">Buka KPI Dashboard</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="opacity-50">
                        <CardHeader>
                            <CardTitle>Fitur Lainnya</CardTitle>
                            <CardDescription>
                                Fitur HR lainnya akan segera ditambahkan
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
