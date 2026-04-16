import { usePage } from '@inertiajs/react';
import { LayoutGrid, Circle, Building, Users, CheckSquare } from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavGroup } from '@/types';

export function useMainNav(): NavGroup[] {
    const { teamsData } = usePage().props as any;

    if (!teamsData) return [];

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
        {
            title: 'HQ',
            icon: Building,
            items: teamsData.hq?.map((t: any) => ({
                title: t.name,
                href: `/teams/${t.slug}`,
                icon: Circle,
            })) || [],
        },
        {
            title: 'Tim',
            icon: Users,
            items: teamsData.team?.map((t: any) => ({
                title: t.name,
                href: `/teams/${t.slug}`,
                icon: Circle,
            })) || [],
        },
        {
            title: 'Proyek',
            icon: CheckSquare,
            items: teamsData.project?.map((t: any) => ({
                title: t.name,
                href: `/teams/${t.slug}`,
                icon: Circle,
            })) || [],
        },
    ];
}
