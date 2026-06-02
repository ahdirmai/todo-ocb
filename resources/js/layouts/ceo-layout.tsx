import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/app-shell';
import { AppContent } from '@/components/app-content';
import { BarChart3, FileText, AlertCircle, Building2, ChevronLeft } from 'lucide-react';

interface CeoLayoutProps {
    children: React.ReactNode;
}

export default function CeoLayout({ children }: CeoLayoutProps) {
    const { url } = usePage();

    const tabs = [
        {
            label: 'Dashboard',
            icon: BarChart3,
            href: '/kpi/ceo/dashboard',
            active: url.startsWith('/kpi/ceo/dashboard') || url.startsWith('/kpi/ceo/user'),
        },
        {
            label: 'Laporan Harian',
            icon: FileText,
            href: '/kpi/ceo/daily-reports',
            active: url.startsWith('/kpi/ceo/daily-reports'),
        },
        {
            label: 'Alerts',
            icon: AlertCircle,
            href: '/kpi/ceo/alerts',
            active: url.startsWith('/kpi/ceo/alerts'),
        },
        {
            label: 'SPV Monitor',
            icon: Building2,
            href: '/kpi/ceo/spv',
            active: url.startsWith('/kpi/ceo/spv'),
        },
    ];

    return (
        <AppShell variant="sidebar">
            <AppContent variant="sidebar" className="overflow-x-hidden">
                {/* Header */}
                <div className="border-b bg-background px-4 py-3">
                    <div className="flex items-center gap-3 mb-3">
                        <Link
                            href="/"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Kembali ke App
                        </Link>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-primary">CEO Area</span>
                    </div>

                    {/* Tab Navigation */}
                    <nav className="flex gap-1 overflow-x-auto -mb-px">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                        tab.active
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
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
