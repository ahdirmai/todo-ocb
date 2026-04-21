import { usePage } from '@inertiajs/react';
import { LayoutGrid, Circle, Building, Users, CheckSquare } from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavGroup } from '@/types';

export function useMainNav(): NavGroup[] {
    const { teamsData } = usePage().props as any;

    if (!teamsData) {
return [];
}

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
