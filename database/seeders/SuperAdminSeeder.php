<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Pastikan role superadmin tersedia (jika RolePermissionSeeder belum dijalankan)
        $superadminRole = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        // Buat user superadmin (atau update jika email sudah ada)
        $user = User::firstOrCreate(
            ['email' => 'superadmin@example.com'], // Sesuaikan emailnya
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Assign role ke user
        if (!$user->hasRole('superadmin')) {
            $user->assignRole($superadminRole);
        }
    }
}
