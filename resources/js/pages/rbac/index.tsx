import { Head, router, usePage, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import * as RbacActions from '@/actions/App/Http/Controllers/PositionAccessController';
import { Checkbox } from '@/components/ui/checkbox';

interface Position {
    id: string;
    name: string;
    permissions: string[];
}

interface AvailableRoute {
    key: string;
    label: string;
    description: string;
}

export default function RbacIndex() {
    const { positions, availableRoutes } = usePage<{
        positions: Position[];
        availableRoutes: AvailableRoute[];
    }>().props;

    setLayoutProps({
        breadcrumbs: [{ title: 'RBAC', href: '/rbac' }],
    });

    const [localPositions, setLocalPositions] = useState(positions);

    const togglePermission = (
        positionId: string,
        routeKey: string,
        hasPermission: boolean,
    ) => {
        // Optimistic update
        setLocalPositions(
            localPositions.map((pos) =>
                pos.id === positionId
                    ? {
                          ...pos,
                          permissions: hasPermission
                              ? pos.permissions.filter((p) => p !== routeKey)
                              : [...pos.permissions, routeKey],
                      }
                    : pos,
            ),
        );

        if (hasPermission) {
            router.delete(RbacActions.destroy.url(), {
                data: { position_id: positionId, route_key: routeKey },
                preserveScroll: true,
                onSuccess: () => router.reload({ only: ['positions'] }),
            });
        } else {
            router.post(
                RbacActions.store.url(),
                { position_id: positionId, route_key: routeKey },
                {
                    preserveScroll: true,
                    onSuccess: () => router.reload({ only: ['positions'] }),
                },
            );
        }
    };

    return (
        <>
            <Head title="RBAC - Position Access Control" />

            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 pt-5 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Position Access Control
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Kelola akses halaman berdasarkan posisi
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                        <h3 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                            Catatan
                        </h3>
                        <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
                            <li>
                                Superadmin dan Admin otomatis memiliki akses ke
                                semua area
                            </li>
                            <li>
                                User tanpa posisi tidak dapat mengakses area
                                berbasis posisi
                            </li>
                            <li>
                                Centang checkbox untuk memberikan akses
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        {localPositions.map((position) => (
                            <div
                                key={position.id}
                                className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white dark:bg-zinc-900"
                            >
                                <div className="border-b border-sidebar-border/70 bg-slate-50 px-4 py-3 dark:bg-zinc-900/50">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                        {position.name}
                                    </h3>
                                </div>
                                <div className="divide-y divide-sidebar-border/50">
                                    {availableRoutes.map((route) => {
                                        const hasPermission =
                                            position.permissions.includes(
                                                route.key,
                                            );
                                        return (
                                            <div
                                                key={route.key}
                                                className="flex items-center justify-between px-4 py-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                                        {route.label}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {route.description}
                                                    </div>
                                                </div>
                                                <Checkbox
                                                    checked={hasPermission}
                                                    onCheckedChange={() =>
                                                        togglePermission(
                                                            position.id,
                                                            route.key,
                                                            hasPermission,
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
