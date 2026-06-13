import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppContent } from '@/components/app-content';
import { BarChart3, FileText, TrendingUp, Calendar, ClipboardList } from 'lucide-react';

interface KpiLayoutProps {
  children: React.ReactNode;
  area: 'hr' | 'operational' | 'gudang';
}

export default function KpiLayout({ children, area }: KpiLayoutProps) {
  const { url, props } = usePage();
  const kpiUrl = `/${area}/kpi`;

  // @ts-ignore - user exists in shared props
  const userPosition = props.auth?.user?.jobPosition?.name;
  const isManager = ['Manager HR', 'Manager Operasional', 'Manager Gudang'].includes(userPosition);

  const allTabs = [
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
      onlyForManagers: true,
    },
    {
      label: 'Riwayat',
      icon: ClipboardList,
      href: `${kpiUrl}/reports`,
      active: url === `${kpiUrl}/reports`,
      onlyForManagers: true,
    },
  ];

  // Filter tabs - hide "Laporan CEO" for non-managers
  const tabs = allTabs.filter(tab => !tab.onlyForManagers || isManager);

  return (
    <AppShell variant="sidebar">
      <AppContent variant="sidebar" className="overflow-x-hidden">
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
        <div className="p-4">{children}</div>
      </AppContent>
    </AppShell>
  );
}
