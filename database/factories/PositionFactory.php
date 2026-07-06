<?php

namespace Database\Factories;

use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Position>
 */
class PositionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Phase 6: explicit metadata defaults so tests using this factory don't
     * silently produce positions with has_kpi=false, area_slug=null.
     * Tests that want a generic Staff-like position should call
     * →generic() instead.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->jobTitle(),
            'description' => fake()->sentence(),
            'created_by' => null,
            'has_kpi' => false,
            'is_manager' => false,
            'area_slug' => null,
            // Default true matches Phase 1 migration column default: non-KPI,
            // non-manager positions require an SPV team to be assigned.
            'requires_spv_team' => true,
        ];
    }

    /**
     * Generic position: no KPI area, not a manager. Use for Staff-like positions.
     */
    public function generic(): self
    {
        return $this->state(fn () => [
            'has_kpi' => false,
            'is_manager' => false,
            'area_slug' => null,
            'requires_spv_team' => true,
        ]);
    }

    /**
     * KPI-enabled line-staff position (non-manager) in a known area.
     * `$area` is REQUIRED to prevent silently defaulting to 'gudang' for tests
     * that forget to specify — a common bug source flagged in code review.
     */
    public function lineStaff(string $area): self
    {
        return $this->state(fn () => [
            'has_kpi' => true,
            'is_manager' => false,
            'area_slug' => $area,
            'requires_spv_team' => false,
        ]);
    }

    /**
     * KPI-enabled manager position in a known area (Manager HR/Operasional/Gudang).
     * `$area` is REQUIRED to prevent silently defaulting to 'gudang' for tests
     * that forget to specify — a common bug source flagged in code review.
     */
    public function kpiManager(string $area): self
    {
        return $this->state(fn () => [
            'has_kpi' => true,
            'is_manager' => true,
            'area_slug' => $area,
            'requires_spv_team' => false,
        ]);
    }

    /**
     * Custom area slug override. Use when introducing a new area not in the
     * standard kpiManager/lineStaff shorthands above (e.g. 'pengawas-svp',
     * 'finance'). Phase 1 cleanup removed the position-name auto-derive
     * shim, so this is the supported way to attach a position to a new area.
     *
     * Has `has_kpi=true` baked in so the position WILL appear in dynamically
     * rendered sidebar / kpiAreas queries — without this, the position
     * would be silently excluded by the `has_kpi = true` filter in
     * HandleInertiaRequests::computeKpiAreas().
     */
    public function withArea(string $slug): self
    {
        return $this->state(fn () => [
            'has_kpi' => true,
            'area_slug' => $slug,
        ]);
    }
}
