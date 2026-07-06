<?php

use App\Models\KpiDailyScore;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::findOrCreate('superadmin', 'web');

    $this->date = now()->toDateString();

    $this->ceo = User::factory()->create();
    $this->ceo->assignRole('superadmin');

    collect([
        ['name' => 'Manager HR', 'area_slug' => 'hr', 'is_manager' => true, 'has_kpi' => true],
        ['name' => 'Manager Operasional', 'area_slug' => 'operational', 'is_manager' => true, 'has_kpi' => true],
        ['name' => 'Manager Gudang', 'area_slug' => 'gudang', 'is_manager' => true, 'has_kpi' => true],
        // Non-manager line staff: must remain excluded from manager-only filters.
        ['name' => 'Gudang BJB', 'area_slug' => 'gudang', 'is_manager' => false, 'has_kpi' => false],
        // updateOrCreate (not factory create) so rows committed by suites that
        // share this persistent test DB but don't use RefreshDatabase (e.g.
        // GudangKpiTest) don't trigger a unique-name collision here.
    ])->each(fn ($attrs) => Position::updateOrCreate(['name' => $attrs['name']], $attrs));
});

function makeScore(string $positionName, string $grade, float $score, string $date): User
{
    $position = Position::where('name', $positionName)->first();
    $user = User::factory()->create(['position_id' => $position->id]);

    KpiDailyScore::create([
        'user_id' => $user->id,
        'position_id' => $position->id,
        'score_date' => $date,
        'total_score' => $score,
        'completed_weight' => 0,
        'total_weight' => 0,
        'total_tasks' => 1,
        'completed_tasks' => 1,
        'verified_tasks' => 1,
        'grade' => $grade,
    ]);

    return $user;
}

it('includes Manager Gudang in gudangScores and allScores', function () {
    makeScore('Manager Gudang', 'A', 90, $this->date);

    actingAs($this->ceo)
        ->get("/kpi/ceo/dashboard?date={$this->date}")
        ->assertInertia(fn ($page) => $page
            ->where('gudangScores', fn ($scores) => count($scores) === 1)
            ->where('allScores', fn ($scores) => count($scores) === 1)
        );
});

it('excludes non-manager positions from allScores and gradeDistribution', function () {
    makeScore('Manager HR', 'A', 90, $this->date);
    makeScore('Gudang BJB', 'D', 40, $this->date); // non-manager, must be excluded

    actingAs($this->ceo)
        ->get("/kpi/ceo/dashboard?date={$this->date}")
        ->assertInertia(fn ($page) => $page
            ->where('allScores', fn ($scores) => count($scores) === 1)
            ->where('gradeDistribution', fn ($dist) => ! array_key_exists('D', (array) $dist))
        );
});

it('flags Manager Gudang with missing report in pendingReports', function () {
    makeScore('Manager Gudang', 'A', 90, $this->date);

    actingAs($this->ceo)
        ->get("/kpi/ceo/dashboard?date={$this->date}")
        ->assertInertia(fn ($page) => $page
            ->where('pendingReports', fn ($pending) => collect($pending)->isNotEmpty())
        );
});
