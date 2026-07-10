<?php

use App\Models\KpiDailyReport;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiReportingService;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

/**
 * Create a KPI task for the user on today's date with the given weight and
 * verified state — used to drive the 80% report-unlock gate.
 */
function makeKpiTask(User $user, float $weight, bool $verified): Task
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => $weight,
    ]);

    return Task::factory()->create([
        'creator_id' => $user->id,
        'kpi_task_definition_id' => $definition->id,
        'is_kpi_task' => true,
        'is_verified' => $verified,
        'created_at' => now(),
    ]);
}

function makeReportUser(string $positionName, string $routeKey = 'gudang'): User
{
    $isManager = str_contains(strtolower($positionName), 'manager');
    // updateOrCreate so a stale row from another suite sharing this persistent
    // test DB has its KPI metadata corrected instead of being reused as-is.
    $position = Position::updateOrCreate(
        ['name' => $positionName],
        [
            'area_slug' => $routeKey,
            'has_kpi' => true,
            'is_manager' => $isManager,
            'requires_spv_team' => false,
        ]
    );
    PositionPermission::firstOrCreate([
        'position_id' => $position->id,
        'route_key' => $routeKey,
    ]);

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

function seedTemplateFields(string $positionName): void
{
    $position = Position::firstOrCreate(['name' => $positionName]);

    $fields = match ($positionName) {
        'Manager Gudang' => [
            ['field_key' => 'recap', 'field_label' => 'Rekap', 'field_type' => 'textarea', 'group_label' => 'Rekap', 'is_required' => true, 'sort_order' => 1, 'field_options' => ['max_length' => 3000]],
            ['field_key' => 'action_plan', 'field_label' => 'Action Plan', 'field_type' => 'textarea', 'group_label' => 'Rencana', 'is_required' => true, 'sort_order' => 2, 'field_options' => ['max_length' => 2000]],
        ],
        'Manager Operasional' => [
            ['field_key' => 'status_34_tasks', 'field_label' => 'Status Task', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => true, 'sort_order' => 1],
            ['field_key' => 'action_plan', 'field_label' => 'Action Plan', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => false, 'sort_order' => 2],
        ],
        default => [],
    };

    foreach ($fields as $field) {
        PositionReportField::updateOrCreate(
            ['position_id' => $position->id, 'field_key' => $field['field_key']],
            $field + ['position_id' => $position->id],
        );
    }
}

test('report template service returns correct fields for position', function (): void {
    seedTemplateFields('Manager Gudang');

    $service = app(KpiReportingService::class);
    $fields = $service->getReportFieldsTemplate('Manager Gudang');

    expect($fields)->toHaveCount(2)
        ->and($fields[0]['field_key'])->toBe('recap')
        ->and($fields[0]['is_required'])->toBeTrue()
        ->and($fields[1]['field_key'])->toBe('action_plan');
});

test('report template service returns empty for unknown position', function (): void {
    $service = app(KpiReportingService::class);
    $fields = $service->getReportFieldsTemplate('NonExistent');

    expect($fields)->toBeEmpty();
});

test('validation rules built from template fields', function (): void {
    seedTemplateFields('Manager Gudang');

    $service = app(KpiReportingService::class);
    $fields = $service->getReportFieldsTemplate('Manager Gudang');
    $rules = $service->buildValidationRules($fields);

    expect($rules)->toHaveKey('fields.recap')
        ->and($rules['fields.recap'])->toContain('required')
        ->and($rules['fields.recap'])->toContain('max:3000')
        ->and($rules)->toHaveKey('attachments');
});

test('manager gudang can create report with dynamic fields', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->get('/gudang/kpi/report/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/report-form')
            ->has('reportFields')
        );
});

test('manager gudang can submit report with fields JSON', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => [
                'recap' => 'Test recap content',
                'action_plan' => 'Test action plan',
            ],
        ])
        ->assertRedirect();

    $report = KpiDailyReport::where('user_id', $user->id)->first();
    expect($report)->not->toBeNull()
        ->and($report->fields)->toBeArray()
        ->and($report->fields['recap'])->toBe('Test recap content')
        ->and($report->fields['action_plan'])->toBe('Test action plan');
});

test('manager operasional can submit report with dynamic fields', function (): void {
    $user = makeReportUser('Manager Operasional', 'operational');
    seedTemplateFields('Manager Operasional');

    actingAs($user)
        ->post('/operational/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => [
                'status_34_tasks' => 'All tasks completed',
                'action_plan' => 'Plan for tomorrow',
            ],
        ])
        ->assertRedirect();

    $report = KpiDailyReport::where('user_id', $user->id)->first();
    expect($report)->not->toBeNull()
        ->and($report->fields['status_34_tasks'])->toBe('All tasks completed');
});

test('duplicate report submission rejected with fields format', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => now()->toDateString(),
        'fields' => ['recap' => 'existing', 'action_plan' => 'existing'],
        'submitted_at' => now(),
    ]);

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => [
                'recap' => 'Duplicate attempt',
                'action_plan' => 'Duplicate',
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('report_date');
});

test('cannot submit report for a past date', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->subDay()->toDateString(),
            'fields' => [
                'recap' => 'Backdated attempt',
                'action_plan' => 'Backdated',
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('report_date');

    expect(KpiDailyReport::where('user_id', $user->id)->count())->toBe(0);
});

test('past date create page is read-only when no report exists', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->get('/gudang/kpi/report/create?date='.now()->subDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/report-form')
            ->where('canSubmit', false)
            ->where('isToday', false)
            ->where('existingReport', null)
        );
});

test('past date create page is read-only when report exists', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => now()->subDay()->toDateString(),
        'fields' => ['recap' => 'yesterday', 'action_plan' => 'yesterday'],
        'submitted_at' => now()->subDay(),
    ]);

    actingAs($user)
        ->get('/gudang/kpi/report/create?date='.now()->subDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canSubmit', false)
            ->where('isToday', false)
            ->where('existingReport.fields.recap', 'yesterday')
        );
});

test('cannot edit a past-date report', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    $report = KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => now()->subDay()->toDateString(),
        'fields' => ['recap' => 'yesterday', 'action_plan' => 'yesterday'],
        'submitted_at' => now()->subDay(),
    ]);

    actingAs($user)
        ->get("/gudang/kpi/report/{$report->id}/edit")
        ->assertForbidden();

    actingAs($user)
        ->put("/gudang/kpi/report/{$report->id}", [
            'fields' => ['recap' => 'edited', 'action_plan' => 'edited'],
        ])
        ->assertForbidden();

    expect($report->fresh()->fields['recap'])->toBe('yesterday');
});

test('today create page allows submit', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->get('/gudang/kpi/report/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canSubmit', true)
            ->where('isToday', true)
        );
});

test('submit blocked when task progress below 80 percent', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    // 3 tasks, weight 10 each; 2 verified = 66.7% < 80%.
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, false);

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => ['recap' => 'x', 'action_plan' => 'x'],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('report_date');

    expect(KpiDailyReport::where('user_id', $user->id)->count())->toBe(0);
});

test('submit allowed when task progress at least 80 percent', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    // 5 tasks, weight 10 each; 4 verified = 80%.
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, true);
    makeKpiTask($user, 10, false);

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => ['recap' => 'x', 'action_plan' => 'x'],
        ])
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    expect(KpiDailyReport::where('user_id', $user->id)->count())->toBe(1);
});

test('submit allowed when user has no kpi tasks for the day', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->toDateString(),
            'fields' => ['recap' => 'x', 'action_plan' => 'x'],
        ])
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors();

    expect(KpiDailyReport::where('user_id', $user->id)->count())->toBe(1);
});

test('report index passes reportFields to frontend', function (): void {
    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->get('/gudang/kpi/reports')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/reports')
            ->has('reportFields')
        );
});

test('admin sees all area member reports, member sees only own', function (): void {
    $userA = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');
    $userB = makeReportUser('Manager Gudang');

    // Persistent test DB — clear gudang-area reports so the admin's area-wide
    // count is deterministic (only the two we create below).
    KpiDailyReport::whereHas('user.jobPosition', fn ($q) => $q->where('area_slug', 'gudang'))->delete();

    $today = now()->toDateString();
    KpiDailyReport::create([
        'user_id' => $userA->id,
        'report_date' => $today,
        'fields' => ['recap' => 'A', 'action_plan' => 'A'],
        'submitted_at' => now(),
    ]);
    KpiDailyReport::create([
        'user_id' => $userB->id,
        'report_date' => $today,
        'fields' => ['recap' => 'B', 'action_plan' => 'B'],
        'submitted_at' => now(),
    ]);

    // Member only sees their own report and can create.
    actingAs($userA)
        ->get('/gudang/kpi/reports')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canCreate', true)
            ->where('reports.total', 1)
        );

    // Admin sees every gudang-area report, read-only (canCreate false).
    $adminRole = Role::firstOrCreate(['name' => 'superadmin']);
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole($adminRole);

    actingAs($admin)
        ->get('/gudang/kpi/reports')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canCreate', false)
            ->where('reports.total', 2)
        );
});

test('admin can view reports with reportFields', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'superadmin']);
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole($adminRole);

    seedTemplateFields('Manager Gudang');

    actingAs($admin)
        ->get('/gudang/kpi/reports')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('reportFields')
        );
});

test('can submit report for a past date when backdated reporting is enabled', function (): void {
    config()->set('services.kpi.allow_backdated_report', true);

    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    // Verified KPI task created yesterday so the 80% gate passes for that date.
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => 100,
    ]);
    Task::factory()->create([
        'creator_id' => $user->id,
        'kpi_task_definition_id' => $definition->id,
        'is_kpi_task' => true,
        'is_verified' => true,
        'created_at' => now()->subDay(),
    ]);

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->subDay()->toDateString(),
            'fields' => [
                'recap' => 'Backdated recap',
                'action_plan' => 'Backdated plan',
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(KpiDailyReport::where('user_id', $user->id)
        ->where('report_date', now()->subDay()->toDateString())
        ->count())->toBe(1);
});

test('cannot submit report for a future date even when backdated reporting is enabled', function (): void {
    config()->set('services.kpi.allow_backdated_report', true);

    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->post('/gudang/kpi/report/submit', [
            'report_date' => now()->addDay()->toDateString(),
            'fields' => [
                'recap' => 'Future recap',
                'action_plan' => 'Future plan',
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('report_date');

    expect(KpiDailyReport::where('user_id', $user->id)->count())->toBe(0);
});

test('past date create page is submittable when backdated reporting is enabled', function (): void {
    config()->set('services.kpi.allow_backdated_report', true);

    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    actingAs($user)
        ->get('/gudang/kpi/report/create?date='.now()->subDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/report-form')
            ->where('canSubmit', true)
            ->where('isToday', false)
        );
});

test('can edit a past-date report when backdated reporting is enabled', function (): void {
    config()->set('services.kpi.allow_backdated_report', true);

    $user = makeReportUser('Manager Gudang');
    seedTemplateFields('Manager Gudang');

    $report = KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => now()->subDay()->toDateString(),
        'fields' => ['recap' => 'yesterday', 'action_plan' => 'yesterday'],
        'submitted_at' => now()->subDay(),
    ]);

    actingAs($user)
        ->get("/gudang/kpi/report/{$report->id}/edit")
        ->assertOk();

    actingAs($user)
        ->put("/gudang/kpi/report/{$report->id}", [
            'fields' => ['recap' => 'edited', 'action_plan' => 'edited'],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($report->fresh()->fields['recap'])->toBe('edited');
});
