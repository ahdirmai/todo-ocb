<?php

namespace Database\Seeders;

use App\Models\Position;
use App\Models\PositionReportField;
use Illuminate\Database\Seeder;

class PositionReportFieldSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedHrFields();
        $this->seedOperationalFields();
        $this->seedGudangFields();
    }

    protected function seedHrFields(): void
    {
        $position = Position::where('name', 'Manager HR')->first();
        if (! $position) {
            return;
        }

        $fields = [
            // Group 1: Absensi
            ['field_key' => 'absensi.hadir_tepat_waktu', 'field_label' => 'Hadir Tepat Waktu', 'field_type' => 'text', 'group_label' => '1. ABSENSI HARI INI (210 karyawan)', 'is_required' => true, 'sort_order' => 1, 'field_options' => ['placeholder' => 'Jumlah karyawan']],
            ['field_key' => 'absensi.telat', 'field_label' => 'Telat (sebutkan toko)', 'field_type' => 'text', 'group_label' => '1. ABSENSI HARI INI (210 karyawan)', 'is_required' => true, 'sort_order' => 2, 'field_options' => ['placeholder' => 'Jumlah + nama toko']],
            ['field_key' => 'absensi.alpha', 'field_label' => 'Alpha/Tanpa Kabar', 'field_type' => 'text', 'group_label' => '1. ABSENSI HARI INI (210 karyawan)', 'is_required' => true, 'sort_order' => 3, 'field_options' => ['placeholder' => 'Jumlah karyawan']],
            ['field_key' => 'absensi.sakit_izin', 'field_label' => 'Sakit/Izin', 'field_type' => 'text', 'group_label' => '1. ABSENSI HARI INI (210 karyawan)', 'is_required' => true, 'sort_order' => 4, 'field_options' => ['placeholder' => 'Jumlah karyawan']],

            // Group 2: Disiplin
            ['field_key' => 'disiplin.sp1', 'field_label' => 'SP1 Baru', 'field_type' => 'text', 'group_label' => '2. DISIPLIN', 'is_required' => true, 'sort_order' => 5, 'field_options' => ['placeholder' => 'Jumlah']],
            ['field_key' => 'disiplin.sp2', 'field_label' => 'SP2 Baru', 'field_type' => 'text', 'group_label' => '2. DISIPLIN', 'is_required' => true, 'sort_order' => 6, 'field_options' => ['placeholder' => 'Jumlah']],
            ['field_key' => 'disiplin.sp3', 'field_label' => 'SP3 Baru', 'field_type' => 'text', 'group_label' => '2. DISIPLIN', 'is_required' => true, 'sort_order' => 7, 'field_options' => ['placeholder' => 'Jumlah']],

            // Group 3: Performance Sales
            ['field_key' => 'performance_sales.top_5', 'field_label' => 'Top 5 Sales Hari Ini', 'field_type' => 'textarea', 'group_label' => '3. PERFORMANCE SALES', 'is_required' => true, 'sort_order' => 8, 'field_options' => ['placeholder' => 'Nama karyawan + nilai penjualan', 'rows' => 3]],
            ['field_key' => 'performance_sales.bottom_5', 'field_label' => 'Bottom 5 Sales Hari Ini', 'field_type' => 'textarea', 'group_label' => '3. PERFORMANCE SALES', 'is_required' => true, 'sort_order' => 9, 'field_options' => ['placeholder' => 'Nama karyawan + nilai penjualan', 'rows' => 3]],

            // Group 4: Compliance
            ['field_key' => 'compliance.minus_setoran', 'field_label' => 'Karyawan dengan Minus Setoran', 'field_type' => 'textarea', 'group_label' => '4. COMPLIANCE', 'is_required' => true, 'sort_order' => 10, 'field_options' => ['placeholder' => 'Nama + jumlah minus', 'rows' => 2]],
            ['field_key' => 'compliance.minus_audit', 'field_label' => 'Karyawan dengan Minus Audit Toko', 'field_type' => 'textarea', 'group_label' => '4. COMPLIANCE', 'is_required' => true, 'sort_order' => 11, 'field_options' => ['placeholder' => 'Nama + temuan audit', 'rows' => 2]],

            // Group 5: Training
            ['field_key' => 'training.instore_selesai', 'field_label' => 'In-Store Training Selesai', 'field_type' => 'text', 'group_label' => '5. TRAINING', 'is_required' => true, 'sort_order' => 12, 'field_options' => ['placeholder' => 'Jumlah toko']],
            ['field_key' => 'training.lulus_hafalan', 'field_label' => 'Sales Lulus Tes Hafalan', 'field_type' => 'text', 'group_label' => '5. TRAINING', 'is_required' => true, 'sort_order' => 13, 'field_options' => ['placeholder' => 'Jumlah sales']],

            // Group 6: Recruitment
            ['field_key' => 'recruitment.pool_pengganti', 'field_label' => 'Pool Pengganti Urgent Tersedia', 'field_type' => 'text', 'group_label' => '6. RECRUITMENT', 'is_required' => true, 'sort_order' => 14, 'field_options' => ['placeholder' => 'Jumlah orang']],
            ['field_key' => 'recruitment.posisi_kosong', 'field_label' => 'Posisi Kosong yang Harus Diisi', 'field_type' => 'text', 'group_label' => '6. RECRUITMENT', 'is_required' => true, 'sort_order' => 15, 'field_options' => ['placeholder' => 'Nama posisi + toko']],

            // Group 7: Action Plan
            ['field_key' => 'action_plan', 'field_label' => 'Action Plan Besok', 'field_type' => 'textarea', 'group_label' => '7. ACTION PLAN BESOK', 'is_required' => false, 'sort_order' => 16, 'field_options' => ['placeholder' => 'Rencana aksi dan target untuk besok...', 'rows' => 4]],
        ];

        foreach ($fields as $field) {
            PositionReportField::updateOrCreate(
                ['position_id' => $position->id, 'field_key' => $field['field_key']],
                $field + ['position_id' => $position->id],
            );
        }
    }

    protected function seedOperationalFields(): void
    {
        $position = Position::where('name', 'Manager Operasional')->first();
        if (! $position) {
            return;
        }

        $fields = [
            ['field_key' => 'status_34_tasks', 'field_label' => 'Status Penyelesaian Task', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => true, 'sort_order' => 1, 'field_options' => ['rows' => 3]],
            ['field_key' => 'spv_status', 'field_label' => 'Status SPV', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => false, 'sort_order' => 2, 'field_options' => ['placeholder' => 'Jumlah SPV, SPV yang tuntas 100%, SPV di bawah 85%, dll.', 'rows' => 3]],
            ['field_key' => 'issues_today', 'field_label' => 'Masalah Hari Ini', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => false, 'sort_order' => 3, 'field_options' => ['placeholder' => 'Kendala atau masalah yang dihadapi hari ini', 'rows' => 3]],
            ['field_key' => 'follow_up', 'field_label' => 'Tindak Lanjut', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => false, 'sort_order' => 4, 'field_options' => ['placeholder' => 'Tindakan yang akan dilakukan untuk mengatasi masalah', 'rows' => 3]],
            ['field_key' => 'action_plan', 'field_label' => 'Rencana Aksi Besok', 'field_type' => 'textarea', 'group_label' => 'Isi Laporan', 'is_required' => false, 'sort_order' => 5, 'field_options' => ['placeholder' => 'Target dan rencana untuk esok hari', 'rows' => 3]],
        ];

        foreach ($fields as $field) {
            PositionReportField::updateOrCreate(
                ['position_id' => $position->id, 'field_key' => $field['field_key']],
                $field + ['position_id' => $position->id],
            );
        }
    }

    protected function seedGudangFields(): void
    {
        $position = Position::where('name', 'Manager Gudang')->first();
        if (! $position) {
            return;
        }

        $fields = [
            ['field_key' => 'recap', 'field_label' => 'Rekap Pengawasan 5 Divisi Gudang & Kurir', 'field_type' => 'textarea', 'group_label' => 'Rekap Pengawasan', 'is_required' => true, 'sort_order' => 1, 'field_options' => ['placeholder' => 'Ringkas status kepatuhan KPI setiap divisi, kendala, dan pencapaian hari ini...', 'rows' => 5, 'max_length' => 3000]],
            ['field_key' => 'action_plan', 'field_label' => 'Action Plan & Follow-up', 'field_type' => 'textarea', 'group_label' => 'Rencana Aksi', 'is_required' => true, 'sort_order' => 2, 'field_options' => ['placeholder' => 'Tindak lanjut yang akan dilakukan untuk perbaikan harian besok...', 'rows' => 4, 'max_length' => 2000]],
        ];

        foreach ($fields as $field) {
            PositionReportField::updateOrCreate(
                ['position_id' => $position->id, 'field_key' => $field['field_key']],
                $field + ['position_id' => $position->id],
            );
        }
    }
}
