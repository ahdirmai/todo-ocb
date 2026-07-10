<?php

use App\Models\KpiDailyReport;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    // Phase 3 gap: SPV TSX exists on disk but not in Vite manifest. Send
    // X-Inertia header so the server returns JSON (bypassing Blade/Vite
    // template rendering entirely). The Inertia version must match or we
    // get a 409 redirect; fetch it from config after app boot.
    $this->withoutVite();
});

function makeSpvUser(): User
{
    $position = Position::updateOrCreate(
        ['name' => 'SPV Unit 1'],
        [
            'area_slug' => 'spv',
            'has_kpi' => true,
            'is_manager' => false,
            'requires_spv_team' => true,
        ]
    );

    PositionPermission::updateOrCreate(
        ['position_id' => $position->id, 'route_key' => 'spv'],
    );

    PositionReportField::updateOrCreate(
        ['position_id' => $position->id, 'field_key' => 'catatan'],
        [
            'field_label' => 'Catatan Harian',
            'field_type' => 'textarea',
            'group_label' => 'Laporan',
            'is_required' => true,
            'sort_order' => 1,
        ]
    );

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

/**
 * SPV user on a throwaway (unique) position whose report template has exactly
 * one required field (`catatan`). Isolates gate/cutoff tests from unrelated
 * seeded fields and pre-existing KPI tasks on the shared "SPV Unit 1" position.
 */
function makeIsolatedSpvUser(): User
{
    $name = 'SPV Cutoff '.uniqid();

    $position = Position::create([
        'name' => $name,
        'area_slug' => 'spv',
        'has_kpi' => true,
        'is_manager' => false,
        'requires_spv_team' => true,
    ]);

    PositionPermission::create([
        'position_id' => $position->id,
        'route_key' => 'spv',
    ]);

    PositionReportField::create([
        'position_id' => $position->id,
        'field_key' => 'catatan',
        'field_label' => 'Catatan Harian',
        'field_type' => 'textarea',
        'group_label' => 'Laporan',
        'is_required' => true,
        'sort_order' => 1,
    ]);

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

/**
 * Create a verified KPI task for the user dated today so the 80% report gate
 * is satisfied (single task, verified → 100% weighted progress).
 */
function satisfyReportGate(User $user): void
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => 100,
    ]);

    Task::factory()->create([
        'creator_id' => $user->id,
        'kpi_task_definition_id' => $definition->id,
        'is_kpi_task' => true,
        'is_verified' => true,
        'verified_at' => now(),
        'created_at' => now(),
    ]);
}

function makeStaffUser(): User
{
    $position = Position::updateOrCreate(
        ['name' => 'Staff Marketing'],
        [
            'area_slug' => null,
            'has_kpi' => false,
            'is_manager' => false,
            'requires_spv_team' => true,
        ]
    );

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

test('spv unit 1 can access report create page', function (): void {
    $user = makeSpvUser();

    actingAs($user)
        ->get(route('spv.kpi.report.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('spv/kpi/report-form')
            ->has('reportFields')
        );
});

test('spv can submit a daily report when gate is satisfied', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeIsolatedSpvUser();
    satisfyReportGate($user);

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Hari ini semua toko normal'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(KpiDailyReport::where('user_id', $user->id)->exists())->toBeTrue();
});

test('kpi position cannot submit report before generating daily tasks', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    // Fresh isolated position: has_kpi=true, no KPI tasks generated for today.
    $user = makeIsolatedSpvUser();

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Belum generate task'],
        ])
        ->assertSessionHasErrors('report_date');

    expect(KpiDailyReport::where('user_id', $user->id)->exists())->toBeFalse();
});

test('dashboard hides report button when kpi tasks not generated', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeIsolatedSpvUser();
    $team = Team::factory()->create(['is_spv_team' => true]);
    $user->teams()->attach($team->id);

    actingAs($user)
        ->get(route('spv.kpi.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canSubmitReport', false)
            ->where('isReportMember', true)
            ->where('hasTasksForDate', false)
        );
});

test('report submitted after 23:30 WITA cutoff is rejected', function (): void {
    $this->travelTo(now()->setTime(23, 31));
    $user = makeIsolatedSpvUser();
    satisfyReportGate($user); // isolate cutoff: gate is satisfied

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Telat lewat cutoff'],
        ])
        ->assertSessionHasErrors('report_date');

    expect(KpiDailyReport::where('user_id', $user->id)->exists())->toBeFalse();
});

test('report submitted exactly at 23:30 WITA is still accepted', function (): void {
    $this->travelTo(now()->setTime(23, 30));
    $user = makeIsolatedSpvUser();
    satisfyReportGate($user);

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Tepat batas'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(KpiDailyReport::where('user_id', $user->id)->exists())->toBeTrue();
});

test('non-spv user cannot access spv report create', function (): void {
    $user = makeStaffUser();

    // position:spv middleware blocks non-SPV before controller runs.
    // Report routes are area-gated at the middleware level, then
    // canSubmitReports() is the inner gate within that area.
    actingAs($user)
        ->get(route('spv.kpi.report.create'))
        ->assertForbidden();
});

test('spv unit 1 can view report history', function (): void {
    $user = makeSpvUser();

    actingAs($user)
        ->get(route('spv.kpi.reports'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('spv/kpi/reports'));
});
