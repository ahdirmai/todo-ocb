import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import AppLayout from './app-layout';
import { BarChart3, FileText, TrendingUp, Calendar, ClipboardList } from 'lucide-react';

interface KpiLayoutProps {
  children: React.ReactNode;
  area: 'hr' | 'operational';
}

export default function KpiLayout({ children, area }: KpiLayoutProps) {
  const { url } = usePage();
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
      {/* Tab Navigation */}
      <div className="border-b -mx-4 -mt-4 px-4">
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
      <div className="mt-6">{children}</div>
    </AppLayout>
  );
}
