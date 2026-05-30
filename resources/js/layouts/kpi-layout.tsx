import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import AppLayout from './app-layout';
import { BarChart3, FileText, TrendingUp, Calendar, ClipboardList, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KpiLayoutProps {
  children: React.ReactNode;
  area: 'hr' | 'operational';
}

export default function KpiLayout({ children, area }: KpiLayoutProps) {
  const { url } = usePage();
  const baseUrl = `/${area}`;
  const kpiUrl = `/${area}/kpi`;

  const tabs = [
    {
      label: 'Dashboard',
      icon: BarChart3,
      href: `${kpiUrl}/dashboard`,
      active: url.startsWith(`${kpiUrl}/dashboard`),
    },
    {
      label: 'Harian',
      icon: Calendar,
      href: `${kpiUrl}/daily`,
      active: url.startsWith(`${kpiUrl}/daily`),
    },
    {
      label: 'Mingguan',
      icon: TrendingUp,
      href: `${kpiUrl}/weekly`,
      active: url.startsWith(`${kpiUrl}/weekly`),
    },
    {
      label: 'Bulanan',
      icon: TrendingUp,
      href: `${kpiUrl}/monthly`,
      active: url.startsWith(`${kpiUrl}/monthly`),
    },
    {
      label: 'Laporan CEO',
      icon: FileText,
      href: `${kpiUrl}/report/create`,
      active: url.startsWith(`${kpiUrl}/report/create`),
    },
    {
      label: 'Riwayat',
      icon: ClipboardList,
      href: `${kpiUrl}/reports`,
      active: url === `${kpiUrl}/reports`,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Link href={baseUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke {area === 'hr' ? 'HR' : 'Operational'}
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              KPI {area === 'hr' ? 'Manager HR' : 'Manager Operasional'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoring dan pelaporan kinerja harian, mingguan, dan bulanan
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    tab.active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </AppLayout>
  );
}
