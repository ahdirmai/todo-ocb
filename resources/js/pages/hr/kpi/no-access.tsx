import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  message: string;
}

export default function HrKpiNoAccess({ message }: Props) {
  return (
    <AppLayout>
      <Head title="Akses Ditolak - KPI" />

      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
              <h1 className="text-2xl font-bold">Akses Ditolak</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="pt-4">
                <Link href="/hr">
                  <Button>Kembali ke HR Area</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
