<?php

use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->withoutVite();

    Role::findOrCreate('superadmin', 'web');

    $this->ceo = User::factory()->create(['position' => 'Direktur']);
    $this->ceo->assignRole('superadmin');

    $this->date = now()->toDateString();

    $this->spvTeam = Team::factory()->create(['is_spv_team' => true]);
});

function attachTaskFor(User $user, Team $team, string $date, bool $verified): Task
{
    $task = Task::factory()->create([
        'team_id' => $team->id,
        'visit_date' => $date,
        'is_verified' => $verified,
    ]);
    $task->assignees()->attach($user->id);

    return $task;
}

test('spvMonitoring only lists members whose position starts with SPV', function (): void {
    $spv = User::factory()->create(['position' => 'SPV Area Banjarbaru']);
    $manager = User::factory()->create(['position' => 'Manager Operasional']);
    $director = User::factory()->create(['position' => 'Direktur']);

    $this->spvTeam->users()->attach([$spv->id, $manager->id, $director->id]);

    attachTaskFor($spv, $this->spvTeam, $this->date, true);
    attachTaskFor($manager, $this->spvTeam, $this->date, true);
    attachTaskFor($director, $this->spvTeam, $this->date, false);

    actingAs($this->ceo)
        ->get(route('kpi.ceo.spv', ['date' => $this->date]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('kpi/ceo-spv')
            ->where('members', fn ($members) => count($members) === 1
                && $members[0]['name'] === $spv->name)
            // Totals exclude Manager/Direktur tasks — only the SPV member's task counts.
            ->where('totalTasksToday', 1)
            ->where('completedTasksToday', 1)
        );
});

test('spvMonitoring excludes the acting CEO even if positioned as SPV', function (): void {
    $ceoAsSpv = User::factory()->create(['position' => 'SPV Area Banjarmasin']);
    $ceoAsSpv->assignRole('superadmin');

    $other = User::factory()->create(['position' => 'SPV Area Tanah Laut']);

    $this->spvTeam->users()->attach([$ceoAsSpv->id, $other->id]);

    actingAs($ceoAsSpv)
        ->get(route('kpi.ceo.spv', ['date' => $this->date]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members', fn ($members) => count($members) === 1
                && $members[0]['name'] === $other->name)
        );
});
