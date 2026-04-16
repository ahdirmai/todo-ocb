import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Team UUID — present for team nav items */
    id?: string;
};

export type NavGroup = {
    title: string;
    icon?: LucideIcon | null;
    /** Grouping key — present for HQ/Tim/Proyek groups */
    grouping?: string;
    items: NavItem[];
};
