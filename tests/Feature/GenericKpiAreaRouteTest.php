<?php

use App\Models\Position;
use App\Models\User;
use App\Support\Kpi\ValidAreasResolver;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    ValidAreasResolver::refresh();
    // Phase 2 delivers routing only; the generic `finance/kpi/dashboard` TSX
    // is a Phase 3 deliverable and is absent from the Vite manifest. Stub Vite
    // so full-page render succeeds and we can assert the controller resolved
    // the correct area + component name.
    $this->withoutVite();
});

function makeAreaManager(string $areaSlug, string $positionName): User
{
    $position = Position::firstOrCreate(
        ['name' => $positionName],
        [
            'area_slug' => $areaSlug,
            'has_kpi' => true,
            'is_manager' => true,
            'requires_spv_team' => false,
        ]
    );

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

test('a brand-new area slug is reachable via the generic route without editing web.php', function (): void {
    $user = makeAreaManager('finance', 'Manager Finance');
    ValidAreasResolver::refresh();

    actingAs($user)
        ->get(route('kpi.area.dashboard', ['area' => 'finance']))
        ->assertInertia(fn ($page) => $page->component('finance/kpi/dashboard', false));
});

test('an unknown area slug returns 404 through the generic route', function (): void {
    $user = makeAreaManager('finance', 'Manager Finance');
    ValidAreasResolver::refresh();

    actingAs($user)
        ->get('/nonexistentarea/kpi/dashboard')
        ->assertNotFound();
});

test('a manager cannot access another areas generic dashboard', function (): void {
    makeAreaManager('finance', 'Manager Finance');
    $other = makeAreaManager('legal', 'Manager Legal');
    ValidAreasResolver::refresh();

    actingAs($other)
        ->get(route('kpi.area.dashboard', ['area' => 'finance']))
        ->assertForbidden();
});

test('an admin can access any valid generic area dashboard', function (): void {
    makeAreaManager('finance', 'Manager Finance');
    ValidAreasResolver::refresh();

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));

    actingAs($admin)
        ->get(route('kpi.area.dashboard', ['area' => 'finance']))
        ->assertInertia(fn ($page) => $page->component('finance/kpi/dashboard', false));
});
