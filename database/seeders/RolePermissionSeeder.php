<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles/permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define all permissions
        $permissions = [
            // Member management
            'viewAny member',
            'create member',
            'update member',
            'delete member',
            'assign role',

            // Tag management
            'viewAny tag',
            'create tag',
            'update tag',
            'delete tag',

            // Task management
            'create task',
            'update task',
            'delete task',
            'update any task',
            'delete any task',

            // Kanban column management
            'create column',
            'update column',
            'delete column',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Superadmin — all permissions
        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $superadmin->syncPermissions(Permission::all());

        // Admin — manage members + tags, all kanban/task management
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions([
            'viewAny member', 'create member', 'update member', 'delete member', 'assign role',
            'viewAny tag', 'create tag', 'update tag', 'delete tag',
            'create task', 'update task', 'delete task', 'update any task', 'delete any task',
            'create column', 'update column', 'delete column',
        ]);

        // Member — basic task interaction only
        $member = Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        $member->syncPermissions([
            'create task', 'update task', 'delete task',
        ]);
    }
}
