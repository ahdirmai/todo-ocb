<?php

use App\Models\Position;
use App\Models\PositionReportField;
use App\Models\User;
use App\Services\KpiReportingService;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

function makeAdminUser(): User
{
    $role = Role::firstOrCreate(['name' => 'superadmin']);
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole($role);

    return $admin;
}

function makeReportFieldPosition(): Position
{
    // Dedicated throwaway position — never a real seeded one. This suite shares
    // the app DB (no RefreshDatabase), so cleaning fields on a real position
    // would wipe production report templates.
    $position = Position::updateOrCreate(
        ['name' => '__Test Report Field Position__'],
        [
            'area_slug' => 'gudang',
            'has_kpi' => true,
            'is_manager' => true,
            'requires_spv_team' => false,
        ]
    );

    // Start each test from a clean slate so raw create() calls don't collide
    // with rows left by prior runs.
    PositionReportField::where('position_id', $position->id)->delete();

    return $position;
}

test('admin can create report field', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    actingAs($admin)
        ->post('/kpi/admin/report-fields', [
            'position_id' => $position->id,
            'field_key' => 'audit.minus',
            'field_label' => 'Minus',
            'field_type' => 'text',
            'group_label' => '1. Hasil Audit',
            'is_required' => true,
            'sort_order' => 1,
            'field_options' => ['placeholder' => 'Total minus'],
        ])
        ->assertRedirect();

    $field = PositionReportField::where('position_id', $position->id)
        ->where('field_key', 'audit.minus')
        ->first();

    expect($field)->not->toBeNull()
        ->and($field->field_label)->toBe('Minus')
        ->and($field->field_type)->toBe('text')
        ->and($field->is_required)->toBeTrue()
        ->and($field->field_options['placeholder'])->toBe('Total minus');
});

test('admin can update report field', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    $field = PositionReportField::create([
        'position_id' => $position->id,
        'field_key' => 'catatan',
        'field_label' => 'Catatan',
        'field_type' => 'textarea',
        'is_required' => false,
        'sort_order' => 5,
    ]);

    actingAs($admin)
        ->put("/kpi/admin/report-fields/{$field->id}", [
            'position_id' => $position->id,
            'field_key' => 'catatan',
            'field_label' => 'Catatan Akhir',
            'field_type' => 'textarea',
            'is_required' => true,
            'sort_order' => 9,
        ])
        ->assertRedirect();

    $field->refresh();
    expect($field->field_label)->toBe('Catatan Akhir')
        ->and($field->is_required)->toBeTrue()
        ->and($field->sort_order)->toBe(9);
});

test('admin can delete report field', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    $field = PositionReportField::create([
        'position_id' => $position->id,
        'field_key' => 'temp',
        'field_label' => 'Temp',
        'field_type' => 'text',
        'is_required' => false,
        'sort_order' => 1,
    ]);

    actingAs($admin)
        ->delete("/kpi/admin/report-fields/{$field->id}")
        ->assertRedirect();

    expect(PositionReportField::find($field->id))->toBeNull();
});

test('non-admin cannot manage report fields', function (): void {
    $position = makeReportFieldPosition();
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);

    actingAs($user)
        ->get('/kpi/admin/report-fields')
        ->assertForbidden();

    actingAs($user)
        ->post('/kpi/admin/report-fields', [
            'position_id' => $position->id,
            'field_key' => 'sneaky',
            'field_label' => 'Sneaky',
            'field_type' => 'text',
            'sort_order' => 1,
        ])
        ->assertForbidden();
});

test('duplicate field key rejected for same position', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    PositionReportField::create([
        'position_id' => $position->id,
        'field_key' => 'kebersihan',
        'field_label' => 'Kebersihan',
        'field_type' => 'textarea',
        'is_required' => true,
        'sort_order' => 1,
    ]);

    actingAs($admin)
        ->post('/kpi/admin/report-fields', [
            'position_id' => $position->id,
            'field_key' => 'kebersihan',
            'field_label' => 'Duplikat',
            'field_type' => 'textarea',
            'is_required' => true,
            'sort_order' => 2,
        ])
        ->assertSessionHasErrors('field_key');
});

test('invalid field key format rejected', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    actingAs($admin)
        ->post('/kpi/admin/report-fields', [
            'position_id' => $position->id,
            'field_key' => 'Invalid Key!',
            'field_label' => 'Bad',
            'field_type' => 'text',
            'sort_order' => 1,
        ])
        ->assertSessionHasErrors('field_key');
});

test('created field appears in report template service', function (): void {
    $admin = makeAdminUser();
    $position = makeReportFieldPosition();

    actingAs($admin)
        ->post('/kpi/admin/report-fields', [
            'position_id' => $position->id,
            'field_key' => 'brandingan',
            'field_label' => 'Brandingan',
            'field_type' => 'textarea',
            'is_required' => true,
            'sort_order' => 1,
        ])
        ->assertRedirect();

    $fields = app(KpiReportingService::class)->getReportFieldsTemplate($position->name);

    expect(collect($fields)->pluck('field_key'))->toContain('brandingan');
});

test('admin report fields page loads with positions', function (): void {
    $admin = makeAdminUser();
    makeReportFieldPosition();

    actingAs($admin)
        ->get('/kpi/admin/report-fields')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('kpi/admin/report-fields')
            ->has('positions')
        );
});
