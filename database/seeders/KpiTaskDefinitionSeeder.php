<?php

namespace Database\Seeders;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Illuminate\Database\Seeder;

class KpiTaskDefinitionSeeder extends Seeder
{
    private function formatWorkMethod(string $title, array $steps, ?string $schedule = null): string
    {
        $html = '';
        if ($schedule) {
            $html .= "<p><strong>Waktu:</strong> {$schedule}</p>";
        }
        if ($title) {
            $html .= "<p><strong>{$title}:</strong></p>";
        }
        $html .= '<ul>';
        foreach ($steps as $step) {
            $html .= "<li>{$step}</li>";
        }
        $html .= '</ul>';

        return $html;
    }

    private function formatVerification(array $items): string
    {
        $html = '<ul>';
        foreach ($items as $item) {
            $html .= "<li>{$item}</li>";
        }
        $html .= '</ul>';

        return $html;
    }

    public function run(): void
    {
        $managerOps = Position::where('name', 'Manager Operasional')->first();
        $managerHR = Position::where('name', 'Manager HR')->first();

        if (! $managerOps) {
            $managerOps = Position::create(['name' => 'Manager Operasional', 'description' => 'Manager Operasional']);
        }

        if (! $managerHR) {
            $managerHR = Position::create(['name' => 'Manager HR', 'description' => 'Manager HR']);
        }

        // Manager Operasional Tasks (34 tasks)
        $managerOpsTasks = [
            // Audit (15%)
            [
                'category' => 'Audit',
                'task_name' => 'Audit Toko Ruang Tim SPV (Random 3 Toko)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pilih random 3 toko (store in store, denda, SP)',
                    'Koordinasi dengan SPV untuk siapkan barang',
                    'Fokus ke laporan SPV dan barang ready',
                ], 'Senin-Kamis jam 11.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan random 3 toko',
                    'Cek fisik barang ready di toko',
                    '<strong>Tag CEO</strong> setiap selesai audit dengan feedback ke toko',
                ]),
                'weight' => 5.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Audit Produk Expired (Random 1 Toko)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek produk WAJIB dicek',
                    'Koordinasi dengan SPV untuk siapkan barang',
                ], 'Jumat jam 11.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan random 1 toko',
                    'Feedback tertulis ke toko',
                ]),
                'weight' => 5.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Audit Cek Barang Retur',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek barang retur ke gudang (rusak atau cacat)',
                    'Koordinasi dengan gudang',
                ], 'Seminggu sekali, random 1 toko'),
                'verification_method' => $this->formatVerification([
                    'Screenshot barang retur yang sudah dicek',
                    'Feedback ke toko',
                ]),
                'weight' => 5.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Monitoring Absensi Harian 3 Shift',
                'work_method' => '<p><strong>Waktu Monitoring:</strong></p><ul><li>Shift Pagi: 07:00-08:00 WITA</li><li>Shift Malam: 15:00-16:00 WITA</li><li>Shift Subuh: 23:00 WITA</li></ul><p><strong>Langkah Kerja:</strong></p><ul><li>Cross-plan check absen 210 karyawan vs jadwal shift</li><li>Identifikasi yang tidak hadir &gt;10 menit</li><li>Koordinasi dengan SPV untuk tindakan urgent</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Rekap harian absensi (Excel/Cicle)',
                    'Bukti screenshot dari grup absen WA 3 shift',
                ]),
                'weight' => 10.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Laporan Keterlambatan & Sakit ke CEO',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pagi: rekap keterlambatan shift pagi/malam',
                    'Kirim ke CEO',
                    'Jumat: rekap mingguan karyawan sakit',
                ]),
                'verification_method' => $this->formatVerification([
                    'Rekap keterlambatan dikirim ke CEO via WA',
                    'Rekap mingguan karyawan sakit',
                ]),
                'weight' => 2.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Cek Target & Laporan Penjualan Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek target sales vs actual harian setiap toko',
                    'Monitor SPV yang di bawah target',
                ]),
                'verification_method' => $this->formatVerification([
                    'Dashboard penjualan harian',
                    'Screenshot laporan penjualan per toko',
                ]),
                'weight' => 5.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Monitoring Transfer Kas Toko ke HO',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek transfer kas dari toko ke HO setiap hari',
                    'Pastikan sesuai closing toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Bukti transfer',
                    'Rekap kas harian',
                ]),
                'weight' => 5.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Monitor Kinerja Sales',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Tarik rekap sales per karyawan dari laporan shift pagi/malam/subuh',
                    'Identifikasi top performer (untuk reward)',
                    'Identifikasi low performer (untuk coaching)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Excel rekap sales harian per karyawan',
                    'Update mingguan ranking',
                ]),
                'weight' => 8.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Verifikasi Pelaksanaan In-Store Training',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap SPV wajib lakukan in-store training tiap kunjungan toko',
                    'Pastikan materi (dari Cicle Ruang Tim SPV) dipraktekkan',
                    'Sales hafal dan praktek minimal 10x ke customer',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan training dari SPV',
                    'Tes hafalan random ke sales',
                    'Rekap mingguan per toko',
                ]),
                'weight' => 6.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Briefing Pagi dengan Tim SPV',
                'work_method' => '<p><strong>Waktu:</strong> Senin-Sabtu jam 08.30 WITA</p><p><strong>Durasi:</strong> Max 30 menit</p><p><strong>Agenda:</strong></p><ul><li>Review kondisi toko kemarin</li><li>Target hari ini</li><li>Motivasi tim</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Screenshot daftar hadir meeting',
                    'Notulen meeting tersimpan di Cicle',
                    '<strong>Tag CEO</strong> setiap selesai meeting',
                ]),
                'weight' => 5.00,
                'sequence_order' => 10,
            ],
            [
                'category' => 'Aset',
                'task_name' => 'Cek Kebersihan, Kerapian, dan Aset Pribadi Karyawan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Dari laporan SPV lajur 20 (kebersihan toko)',
                    'Cek barang pribadi karyawan',
                    'Pastikan tidak ada penyimpangan (barang tidak wajar atau pelanggaran)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kondisi toko dari SPV',
                    'Catatan jika ada temuan',
                ]),
                'weight' => 5.00,
                'sequence_order' => 11,
            ],
            [
                'category' => 'Laporan',
                'task_name' => 'Verifikasi Laporan Matikan & Nyalakan Lampu',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek 37 toko sudah lapor matikan lampu 06.00',
                    'Laporan tim toko yang telat berangkat',
                    'Koordinasi dengan SPV untuk cek toko yang sering telat',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan lampu pagi & sore',
                    'Rekap toko yang sering telat',
                ]),
                'weight' => 5.00,
                'sequence_order' => 12,
            ],
            [
                'category' => 'Reporting',
                'task_name' => 'Rekap Harian & Lapor ke CEO',
                'work_method' => '<p><strong>Deadline:</strong> Jam 22.00 WITA</p><p><strong>Isi Dashboard:</strong></p><ul><li>Jumlah hadir/telat/alpha</li><li>SP baru</li><li>Minus karyawan</li><li>Top/low performer</li><li>Training selesai</li><li>Hasil meeting pagi</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Dashboard harian dikirim ke CEO sebelum 22.30 WITA via Cicle',
                ]),
                'weight' => 5.00,
                'sequence_order' => 13,
            ],
            [
                'category' => 'Operasional Toko',
                'task_name' => 'Setup Harian Toko (Aturan Toko & SOP)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan semua toko punya aturan toko terpampang (laminating)',
                    'Update SOP jika ada perubahan',
                    'Kirim ke grup toko tiap ada perubahan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto aturan toko terpampang dari SPV',
                    'Rekap update SOP',
                ]),
                'weight' => 4.00,
                'sequence_order' => 14,
            ],
            [
                'category' => 'Returan',
                'task_name' => 'Tindak Lanjut Returan Barang',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Barang rusak tidak sesuai SOP returan = beban tim toko',
                    'Pastikan minus tercatat dan dipotong sesuai aturan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Cek kartu tugas Returan Barang di Cicle',
                    'Database minus karyawan',
                ]),
                'weight' => 4.00,
                'sequence_order' => 15,
            ],
            [
                'category' => 'Evaluasi',
                'task_name' => 'Evaluasi Akhir Kartu Tugas SPV',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek setiap laporan SPV',
                    'Beri evaluasi tertulis di kolom komentar',
                    'Geser kartu ke "Tugas Selesai"',
                ]),
                'verification_method' => $this->formatVerification([
                    'Setiap kartu SPV yang selesai harus ada komentar evaluasi',
                    'Kartu sudah di lajur Tugas Selesai',
                ]),
                'weight' => 4.00,
                'sequence_order' => 16,
            ],
            [
                'category' => 'Pricing',
                'task_name' => 'Update Harga & Promo Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Kirim update harga baru atau promo ke grup WA toko',
                    'Pastikan SPV edukasi ke sales',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot WA grup update harga',
                    'Konfirmasi SPV sudah edukasi sales',
                ]),
                'weight' => 3.00,
                'sequence_order' => 17,
            ],
            [
                'category' => 'Setup Harian',
                'task_name' => 'Monitoring Setup Toko Pagi',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan setup toko dari SPV sebelum jam 09.00 WITA',
                    'Pastikan semua toko ready',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan setup toko dari SPV',
                    'Tag CEO jika ada toko yang belum ready',
                ]),
                'weight' => 2.00,
                'sequence_order' => 18,
            ],
            [
                'category' => 'Penataan Toko',
                'task_name' => 'Cek Penataan Produk & Display Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Dari laporan SPV, cek foto penataan produk',
                    'Pastikan sesuai standar visual merchandising',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto display toko dari SPV',
                    'Feedback jika ada yang perlu diperbaiki',
                ]),
                'weight' => 2.00,
                'sequence_order' => 19,
            ],
            [
                'category' => 'Inventory',
                'task_name' => 'Monitoring Stok Barang Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan stok dari SPV',
                    'Pastikan tidak ada stok mati atau over stock',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan stok dari SPV',
                    'Rekomendasi jika ada stok yang perlu direorder',
                ]),
                'weight' => 2.00,
                'sequence_order' => 20,
            ],
            [
                'category' => 'Branding',
                'task_name' => 'Update Branding & Material Promosi Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Kirim material branding baru (poster, banner) ke toko',
                    'Pastikan dipasang',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto branding terpasang dari SPV',
                ]),
                'weight' => 2.00,
                'sequence_order' => 21,
            ],
            [
                'category' => 'Kebersihan',
                'task_name' => 'Monitoring Kebersihan Toko Harian',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan kebersihan toko dari SPV',
                    'Pastikan toko selalu bersih',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kebersihan toko dari SPV',
                    'Feedback jika ada yang perlu diperbaiki',
                ]),
                'weight' => 2.00,
                'sequence_order' => 22,
            ],
            [
                'category' => 'Manajemen',
                'task_name' => 'Koordinasi dengan Tim Gudang & Logistik',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Koordinasi harian dengan gudang untuk pengiriman barang ke toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan koordinasi dengan gudang',
                ]),
                'weight' => 2.00,
                'sequence_order' => 23,
            ],
            [
                'category' => 'Marketing',
                'task_name' => 'Koordinasi Kampanye Marketing',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Koordinasi dengan tim marketing untuk kampanye promosi di toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan koordinasi kampanye marketing',
                ]),
                'weight' => 2.00,
                'sequence_order' => 24,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Audit Cash Flow Harian Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan cash flow dari kasir',
                    'Pastikan tidak ada selisih kas',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan cash flow harian',
                    'Tag CEO jika ada selisih &gt; 50rb',
                ]),
                'weight' => 2.00,
                'sequence_order' => 25,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Follow Up Karyawan Alpha Tanpa Kabar',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Hubungi karyawan yang alpha tanpa kabar',
                    'Koordinasi dengan SPV untuk investigasi',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan investigasi',
                    'Tindakan yang diambil',
                ]),
                'weight' => 2.00,
                'sequence_order' => 26,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Verifikasi Laporan Pengeluaran Operasional Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan pengeluaran operasional toko',
                    'Pastikan sesuai budget',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan pengeluaran',
                    'Bukti pembayaran',
                ]),
                'weight' => 2.00,
                'sequence_order' => 27,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Tracking Target Bulanan per Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Monitor progress target bulanan setiap toko',
                    'Update dashboard weekly',
                ]),
                'verification_method' => $this->formatVerification([
                    'Dashboard target bulanan',
                    'Update setiap Senin',
                ]),
                'weight' => 2.00,
                'sequence_order' => 28,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Evaluasi Efektivitas Training Sales',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek improvement sales setelah training',
                    'Compare sales before & after',
                ]),
                'verification_method' => $this->formatVerification([
                    'Report sales comparison',
                    'Tes hafalan sales',
                ]),
                'weight' => 2.00,
                'sequence_order' => 29,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Koordinasi dengan CEO untuk Update Kebijakan',
                'work_method' => '<p><strong>Durasi:</strong> Max 30 menit</p>'.$this->formatWorkMethod('Langkah Kerja', [
                    'Meeting dengan CEO untuk update kebijakan operasional',
                ]),
                'verification_method' => $this->formatVerification([
                    'Notulen meeting',
                    'Action items',
                ]),
                'weight' => 1.00,
                'sequence_order' => 30,
            ],
            [
                'category' => 'Aset',
                'task_name' => 'Monitoring Kondisi Aset Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan kondisi aset dari SPV (AC, Lemari Es, dll)',
                    'Koordinasi perbaikan jika ada kerusakan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan kondisi aset',
                    'Foto jika ada kerusakan',
                ]),
                'weight' => 1.00,
                'sequence_order' => 31,
            ],
            [
                'category' => 'Laporan',
                'task_name' => 'Verifikasi Kelengkapan Dokumen Administrasi Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek kelengkapan dokumen administrasi toko (izin, pajak, dll)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Checklist dokumen administrasi',
                ]),
                'weight' => 1.00,
                'sequence_order' => 32,
            ],
            [
                'category' => 'Reporting',
                'task_name' => 'Buat Laporan Mingguan untuk Review CEO',
                'work_method' => '<p><strong>Deadline:</strong> Senin pagi sebelum jam 10.00 WITA</p>'.$this->formatWorkMethod('Langkah Kerja', [
                    'Kompilasi data mingguan (sales, absensi, training, audit)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan mingguan dikirim ke CEO sebelum jam 10.00 WITA',
                ]),
                'weight' => 1.00,
                'sequence_order' => 33,
            ],
            [
                'category' => 'Evaluasi',
                'task_name' => 'Review Performance SPV Bulanan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Evaluasi kinerja SPV setiap bulan',
                    'Meeting 1-on-1 untuk feedback',
                ]),
                'verification_method' => $this->formatVerification([
                    'Form evaluasi SPV',
                    'Notulen meeting',
                ]),
                'weight' => 1.00,
                'sequence_order' => 34,
            ],
        ];

        // Manager HR Tasks (16 tasks)
        $managerHRTasks = [
            [
                'category' => 'Meeting Pagi',
                'task_name' => 'Memimpin Meeting Pagi Harian',
                'work_method' => '<p><strong>Waktu:</strong></p><ul><li>Senin-Kamis & Sabtu: 11.00 WITA</li><li>Jumat: 10.00 WITA</li></ul><p><strong>Ketentuan:</strong> WAJIB hadir tepat waktu (toleransi max 5 menit)</p><p><strong>Durasi:</strong> Max 30 menit, fokus & terstruktur</p><p><strong>Agenda:</strong></p><ul><li>Review absensi kemarin</li><li>Masalah toko</li><li>Action plan hari ini</li><li>Motivasi tim</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Screenshot daftar hadir meeting (Zoom/WA/offline)',
                    'Notulen meeting tersimpan di Cicle',
                    '<strong>Tag CEO</strong> setiap selesai meeting dengan ringkasan poin utama',
                ]),
                'weight' => 8.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Monitoring Absensi Harian 3 Shift',
                'work_method' => '<p><strong>Waktu Monitoring:</strong></p><ul><li>Shift Pagi: 07:00-08:00 WITA</li><li>Shift Malam: 15:00-16:00 WITA</li><li>Shift Subuh: 23:00 WITA</li></ul><p><strong>Langkah Kerja:</strong></p><ul><li>Cross-plan check absen 210 karyawan vs jadwal shift</li><li>Identifikasi yang tidak hadir &gt;10 menit</li><li>Koordinasi dengan SPV untuk pengganti urgent</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Rekap harian absensi (Excel/Cicle)',
                    'Bukti screenshot dari grup absen WA 3 shift',
                ]),
                'weight' => 10.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Disiplin',
                'task_name' => 'Verifikasi Laporan Matikan & Nyalakan Lampu',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek 37 toko sudah lapor matikan lampu 06.00',
                    'Laporan tim toko yang telat berangkat',
                    'Rekap catatan disiplin tim (dari Cicle Ruang Tim SPV)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan lampu pagi & sore',
                    'Rekap toko yang sering telat',
                ]),
                'weight' => 4.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Disiplin',
                'task_name' => 'Tracking Pemberian SP1/SP2/SP3',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Catat setiap SP yang dikeluarkan SPV',
                    'Update di file HR',
                    'Pastikan karyawan tanda-tangan dan terima salinan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Database SP karyawan (Excel/Cicle)',
                    'Scan dokumen SP yang ditandatangani',
                ]),
                'weight' => 6.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'SOP',
                'task_name' => 'Monitoring Kepatuhan SOP Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan setiap toko punya aturan toko ditandatangani tim toko',
                    'Ada dokumen SP karyawan',
                    'Cek setiap minggu update apa belum',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto aturan toko dari SPV',
                    'Database 37 toko: ada/tidak',
                ]),
                'weight' => 4.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Verifikasi Pelaksanaan In-Store Training',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap SPV wajib lakukan in-store training tiap kunjungan toko',
                    'Pastikan materi (dari Cicle Ruang Tim SPV) dipraktekkan',
                    'Sales hafal dan praktek minimal 10x ke customer',
                ]),
                'verification_method' => $this->formatVerification([
                    'Laporan training dari SPV',
                    'Tes hafalan random ke sales',
                    'Rekap mingguan per toko',
                ]),
                'weight' => 8.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Evaluasi Trainer & Trainingan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan Trainer di Cicle',
                    'Beri evaluasi setiap training selesai',
                    'Identifikasi trainer yang under-perform untuk pembenahan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Cek lajur Laporan Pengecekan Trainingan di Cicle',
                    'Catatan evaluasi tertulis',
                ]),
                'weight' => 4.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Performance',
                'task_name' => 'Monitor Kinerja Sales',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Tarik rekap sales per karyawan dari laporan shift pagi/malam/subuh',
                    'Identifikasi top performer (untuk reward)',
                    'Identifikasi low performer (untuk coaching)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Excel rekap sales harian per karyawan',
                    'Update mingguan ranking',
                ]),
                'weight' => 8.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Compliance',
                'task_name' => 'Identifikasi & Tindak Lanjut Karyawan dengan Minus/Selisih Setoran',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek laporan saldo & setoran (lajur 4 & 25 SPV)',
                    'Karyawan dengan minus berulang = panggil untuk investigasi',
                    'Investigasi: kebocoran, kesalahan kasir, atau penyalahgunaan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Database karyawan + frekuensi minus',
                    'Catatan hasil interview/investigasi',
                ]),
                'weight' => 10.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Compliance',
                'task_name' => 'Rekap Audit Toko per Karyawan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Audit toko (lajur 8 SPV) menunjukkan plus/minus aset per toko',
                    'Cross-check siapa shift saat barang hilang',
                    'Track akumulasi minus per karyawan untuk evaluasi bulanan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Database audit per toko per shift',
                    'Laporan akumulasi minus per karyawan untuk evaluasi bulanan',
                ]),
                'weight' => 7.00,
                'sequence_order' => 10,
            ],
            [
                'category' => 'Compliance',
                'task_name' => 'Tindak Lanjut Returan Barang',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Barang rusak tidak sesuai SOP returan = beban tim toko',
                    'Pastikan minus tercatat dan dipotong sesuai aturan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Cek kartu tugas Returan Barang di Cicle',
                    'Database minus karyawan',
                ]),
                'weight' => 4.00,
                'sequence_order' => 11,
            ],
            [
                'category' => 'Compliance',
                'task_name' => 'Cek Kebersihan, Kerapian, dan Aset Pribadi Karyawan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Dari laporan SPV lajur 20 (kebersihan toko)',
                    'Cek barang pribadi karyawan',
                    'Pastikan ada penyimpangan (barang tidak wajar atau pelanggaran)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kondisi toko dari SPV',
                    'Catatan jika ada temuan',
                ]),
                'weight' => 3.00,
                'sequence_order' => 12,
            ],
            [
                'category' => 'Rekrutmen',
                'task_name' => 'Rekrutmen & Pengganti Urgent',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Jika lajur absen SPV menunjukkan karyawan resign tanpa kabar &gt;10 menit',
                    'Siapkan pool pengganti urgent',
                    'Update database calon karyawan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Database pool pengganti',
                    'Catatan response time setiap kasus urgent',
                ]),
                'weight' => 7.00,
                'sequence_order' => 13,
            ],
            [
                'category' => 'Database',
                'task_name' => 'Update Database Karyawan',
                'work_method' => '<p><strong>Jumlah:</strong> 210 karyawan</p><p><strong>Data yang di-maintain:</strong></p><ul><li>Data pribadi</li><li>Kontak darurat</li><li>Jadwal shift</li><li>Area toko</li><li>Riwayat SP</li><li>Riwayat training</li><li>Evaluasi</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Database HR (Cicle / Excel cloud)',
                    'Update real-time setiap perubahan',
                ]),
                'weight' => 4.00,
                'sequence_order' => 14,
            ],
            [
                'category' => 'Reporting',
                'task_name' => 'Rekap Harian HR & Lapor ke CEO',
                'work_method' => '<p><strong>Deadline:</strong> Jam 22.00 WITA</p><p><strong>Isi Dashboard:</strong></p><ul><li>Jumlah hadir/telat/alpha</li><li>SP baru</li><li>Minus karyawan</li><li>Top/low performer</li><li>Training selesai</li><li>Hasil meeting pagi</li></ul>',
                'verification_method' => $this->formatVerification([
                    'Dashboard HR harian dikirim ke CEO sebelum 22.30 WITA via Cicle',
                ]),
                'weight' => 10.00,
                'sequence_order' => 15,
            ],
            [
                'category' => 'Engagement',
                'task_name' => 'Koordinasi Mob-Sale',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Mob-sale (lajur 24) butuh partisipasi tim toko',
                    'Pastikan rotasi adil, semua sales kebagian giliran',
                    'Evaluasi mingguan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Jadwal mob-sale per toko',
                    'Bukti foto/video pelaksanaan',
                ]),
                'weight' => 3.00,
                'sequence_order' => 16,
            ],
        ];

        // Insert tasks with description field set to null
        foreach ($managerOpsTasks as $task) {
            KpiTaskDefinition::create(array_merge(
                ['description' => null, 'position_id' => $managerOps->id, 'is_active' => true],
                $task
            ));
        }

        foreach ($managerHRTasks as $task) {
            KpiTaskDefinition::create(array_merge(
                ['description' => null, 'position_id' => $managerHR->id, 'is_active' => true],
                $task
            ));
        }
    }
}
