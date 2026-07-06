import { usePage } from '@inertiajs/react';
import { LayoutGrid, Circle, Building, Users, CheckSquare, BarChart3 } from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavGroup } from '@/types';

export function useMainNav(): NavGroup[] {
    const { teamsData, auth } = usePage().props as any;

    if (!teamsData) {
return [];
}

    // Derive the user's primary KPI area from the shared `kpiAreas` prop.
    // This replaces the previous hardcoded Manager HR / Manager Operasional
    // match and now works for ANY position (Manager Gudang, future positions).
    const userPositionId = auth?.user?.jobPosition?.id;
    const kpiAreas: Array<{
        primaryPositionId: string;
        slug: string;
        dashboardUrl: string;
    }> = auth?.kpiAreas ?? [];

    const primaryKpiArea = kpiAreas.find(
        (a) => a.primaryPositionId === userPositionId,
    ) ?? kpiAreas[0] ?? null;

    return [
        {
            title: 'Platform',
            icon: LayoutGrid,
            items: [
                {
                    title: 'Dashboard',
                    href: dashboard(),
                    icon: Circle,
                },
                ...(primaryKpiArea
                    ? [{
                        title: 'KPI Dashboard',
                        href: primaryKpiArea.dashboardUrl,
                        icon: BarChart3,
                    }]
                    : []),
            ],
        },
        ...(teamsData.hq && teamsData.hq.length > 0
            ? [
                  {
                      title: 'HQ',
                      icon: Building,
                      grouping: 'hq',
                      items: teamsData.hq.map((t: any) => ({
                          title: t.name,
                          href: `/teams/${t.slug}`,
                          icon: Circle,
                          id: t.id,
                          isActive: t.is_active,
                      })),
                  },
              ]
            : []),
        ...(teamsData.team && teamsData.team.length > 0
            ? [
                  {
                      title: 'Tim',
                      icon: Users,
                      grouping: 'team',
                      items: teamsData.team.map((t: any) => ({
                          title: t.name,
                          href: `/teams/${t.slug}`,
                          icon: Circle,
                          id: t.id,
                          isActive: t.is_active,
                      })),
                  },
              ]
            : []),
        ...(teamsData.project && teamsData.project.length > 0
            ? [
                  {
                      title: 'Proyek',
                      icon: CheckSquare,
                      grouping: 'project',
                      items: teamsData.project.map((t: any) => ({
                          title: t.name,
                          href: `/teams/${t.slug}`,
                          icon: Circle,
                          id: t.id,
                          isActive: t.is_active,
                      })),
                  },
              ]
            : []),
    ];
}
