import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import AppLayout from './app-layout';
import { BarChart3, FileText, Home, TrendingUp, Calendar, ClipboardList } from 'lucide-react';

interface KpiLayoutProps {
  children: React.ReactNode;
  area: 'hr' | 'operational';
}

export default function KpiLayout({ children, area }: KpiLayoutProps) {
  const { url } = usePage();
  const baseUrl = `/${area}`;
  const kpiUrl = `/${area}/kpi`;

  const menuItems = [
    {
      label: 'Dashboard Area',
      icon: Home,
      href: baseUrl,
      active: url === baseUrl,
    },
    {
      label: 'KPI Dashboard',
      icon: BarChart3,
      href: `${kpiUrl}/dashboard`,
      active: url.startsWith(`${kpiUrl}/dashboard`),
    },
    {
      label: 'Skor Harian',
      icon: Calendar,
      href: `${kpiUrl}/daily`,
      active: url.startsWith(`${kpiUrl}/daily`),
    },
    {
      label: 'Skor Mingguan',
      icon: TrendingUp,
      href: `${kpiUrl}/weekly`,
      active: url.startsWith(`${kpiUrl}/weekly`),
    },
    {
      label: 'Skor Bulanan',
      icon: TrendingUp,
      href: `${kpiUrl}/monthly`,
      active: url.startsWith(`${kpiUrl}/monthly`),
    },
    {
      label: 'Laporan CEO',
      icon: FileText,
      href: `${kpiUrl}/report/create`,
      active: url.startsWith(`${kpiUrl}/report`),
    },
    {
      label: 'Riwayat Laporan',
      icon: ClipboardList,
      href: `${kpiUrl}/reports`,
      active: url === `${kpiUrl}/reports`,
    },
  ];

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-6">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-4 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {area === 'hr' ? 'Manager HR' : 'Manager Operasional'}
              </h2>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        item.active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </AppLayout>
  );
}
