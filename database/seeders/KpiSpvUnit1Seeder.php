<?php

namespace Database\Seeders;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\PositionReportField;
use Illuminate\Database\Seeder;

/**
 * KPI Harian SPV Unit 1 — 34 lajur tugas harian (bobot total 100%).
 * Sumber: "KPI-Harian-SPV-Unit-1.pdf" (OCB Group, Versi 1.0).
 *
 * Idempotent: uses updateOrCreate keyed on (position_id, sequence_order) so
 * re-running the migration or seeder never duplicates rows and always brings
 * definitions back in sync with this file.
 */
class KpiSpvUnit1Seeder extends Seeder
{
    private function formatWorkMethod(array $steps, ?string $schedule = null): string
    {
        $html = '';
        if ($schedule) {
            $html .= "<p><strong>Waktu:</strong> {$schedule}</p>";
        }
        $html .= '<p><strong>Cara Kerja:</strong></p><ul>';
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
        $spv = Position::updateOrCreate(
            ['name' => 'SPV Unit 1'],
            [
                'description' => 'Supervisor Unit 1 — pelaksana 34 lajur tugas harian di Cicle',
                'area_slug' => 'spv',
                'has_kpi' => true,
                'is_manager' => false,
                'requires_spv_team' => true,
            ]
        );

        PositionPermission::firstOrCreate([
            'position_id' => $spv->id,
            'route_key' => 'spv',
        ]);

        foreach ($this->tasks() as $task) {
            KpiTaskDefinition::updateOrCreate(
                ['position_id' => $spv->id, 'sequence_order' => $task['sequence_order']],
                array_merge(['description' => null, 'is_active' => true], $task)
            );
        }

        foreach ($this->reportFields() as $field) {
            PositionReportField::updateOrCreate(
                ['position_id' => $spv->id, 'field_key' => $field['field_key']],
                $field + ['position_id' => $spv->id]
            );
        }
    }

    /**
     * Format Laporan Kunjungan Harian SPV (PDF Bagian C). Drives the dynamic
     * daily-report form for SPV Unit 1.
     *
     * @return array<int, array<string, mixed>>
     */
    private function reportFields(): array
    {
        $g = fn (string $key, string $label, string $group, int $order, bool $required = true, array $options = []): array => [
            'field_key' => $key,
            'field_label' => $label,
            'field_type' => 'textarea',
            'group_label' => $group,
            'is_required' => $required,
            'sort_order' => $order,
            'field_options' => $options + ['rows' => 3],
        ];

        return [
            $g('audit.minus', 'Minus', '1. HASIL AUDIT TOKO', 1, true, ['placeholder' => 'Total minus temuan audit']),
            $g('audit.plus', 'Plus', '1. HASIL AUDIT TOKO', 2, true, ['placeholder' => 'Total plus temuan audit']),
            $g('audit.total_selisih', 'Total Selisih', '1. HASIL AUDIT TOKO', 3, true, ['placeholder' => 'Total selisih akhir']),
            $g('barang_beda_harga', 'Barang Beda Harga / Belum Ada Barcode', '2. BARANG BEDA HARGA / BARCODE', 4, false, ['placeholder' => 'Daftar barang + status barcode']),
            $g('rak_acc_kosong', 'Rak/Ram ACC yang Kosong', '3. RAK/RAM ACC KOSONG', 5, false, ['placeholder' => 'Kebutuhan tambahan ACC']),
            $g('barang_returan', 'Barang Returan', '4. BARANG RETURAN', 6, false, ['placeholder' => 'Barang yang diretur, atau "tidak ada"']),
            $g('daftar_harga_spanduk', 'Kondisi Daftar Harga & Spanduk Angka', '5. DAFTAR HARGA & SPANDUK', 7, false, ['placeholder' => 'Kondisi & perubahan daftar harga']),
            $g('barang_kosong_dicari', 'Barang Kosong yang Sering Dicari Customer', '6. BARANG KOSONG DICARI CUSTOMER', 8, false, ['placeholder' => 'Barang kosong + rekomendasi']),
            $g('kebersihan', 'Kebersihan & Kerapian Toko', '7. KEBERSIHAN & KERAPIAN', 9, true, ['placeholder' => 'Halaman, lantai, plafon, etalase, WC, dll', 'rows' => 4]),
            $g('brandingan', 'Kondisi Brandingan', '8. KONDISI BRANDINGAN', 10, true, ['placeholder' => 'Papan nama, banner, spanduk promo, dll', 'rows' => 4]),
            $g('aset_penting', 'Aset Penting Toko', '9. ASET PENTING TOKO', 11, true, ['placeholder' => 'PC, Tab/HP, Printer, Mesin Anti Gores — jumlah, merk, kondisi', 'rows' => 4]),
            $g('instore_training', 'Laporan In-Store Training', '10. IN-STORE TRAINING', 12, true, ['placeholder' => 'Hasil training & tes hafalan sales']),
            $g('aturan_manajemen', 'Laporan Aturan Manajemen Toko', '11. ATURAN MANAJEMEN TOKO', 13, false, ['placeholder' => 'Status aturan toko']),
            $g('mob_sale', 'Laporan Mob-Sale', '12. MOB-SALE', 14, false, ['placeholder' => 'Pelaksanaan mob-sale']),
            $g('catatan', 'Catatan', '13. CATATAN', 15, false, ['placeholder' => 'Lajur yang belum dikerjakan + alasan + bukti pengganti', 'rows' => 4]),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function tasks(): array
    {
        return [
            [
                'category' => 'Setup Harian',
                'task_name' => 'Buat Kartu Tugas Harian (PIC, Tujuan, Tanggal Kunjungan)',
                'work_method' => $this->formatWorkMethod([
                    'Setiap pagi membuat kartu tugas di Cicle dengan judul OC(Toko)-(Tanggal)',
                    'Isi anggota, label nama SPV & area toko',
                    'Tenggat H+1 jam 12.00 WITA',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot kartu tugas yang sudah dibuat di lajur PIC, Tujuan, Tanggal Kunjungan',
                ]),
                'weight' => 2.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Cek Absen Kehadiran Shift Pagi',
                'work_method' => $this->formatWorkMethod([
                    'Pantau kehadiran tim toko shift pagi',
                    'Jika telat &gt;5 menit tanpa kabar, telepon WA maks 5x &amp; telepon biasa maks 3x',
                    'Lewat 10 menit tanpa kabar, cari pengganti urgent',
                    'Jika semua hadir, balas di grup "shift pagi sudah hadir" dengan Cc Pak Oscar, Pak Rijal &amp; SPV lain',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot chat laporan kehadiran di grup WA',
                    'Catatan "Done pengecekan Absen Kehadiran Shift Pagi √" di kolom komentar kartu tugas',
                ]),
                'weight' => 4.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Operasional Toko',
                'task_name' => 'Verifikasi Absen Matikan Lampu (06.00 WITA)',
                'work_method' => $this->formatWorkMethod([
                    'Cek foto toko depan (lampu mati &amp; sudah terang dari dalam) dan foto Running Text setiap toko',
                    'Beri reaction jika foto &amp; jam sesuai',
                    'Balas grup "sudah laporan absen matikan lampu" dengan Cc lengkap',
                ], '06.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan matikan lampu',
                    'Catatan "Done pengecekan Absen Matikan Lampu √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Cek Laporan Saldo & Setoran Shift Malam/Subuh',
                'work_method' => $this->formatWorkMethod([
                    'Cek foto saldo aplikasi vs iPos harus sama, dan foto kertas setoran (uang makan, pengeluaran, selisih)',
                    'Tindak lanjuti langsung jika ada yang mencurigakan atau minus',
                    'Beri solusi ke karyawan toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap laporan saldo &amp; setoran di grup',
                    'Catatan tindak lanjut minus (jika ada) di kolom komentar kartu tugas',
                ]),
                'weight' => 5.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Cek Sales Report – Retail Shift Malam/Subuh',
                'work_method' => $this->formatWorkMethod([
                    'Beri reaction/emoji pada semua laporan',
                    'Komentar motivasi push target di setiap laporan retail toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot komentar SPV di grup sales report',
                    'Catatan "Done pengecekan Sales Report – Retail Shift Malam/Subuh √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Cek Sales Report – Anti Gores Shift Malam/Subuh',
                'work_method' => $this->formatWorkMethod([
                    'Beri reaction/emoji dan komentar motivasi push target Anti Gores di setiap laporan toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot komentar SPV di grup Anti Gores',
                    'Catatan "Done pengecekan Sales Report – Anti Gores Shift Malam/Subuh √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Balas Notifikasi Cicle & WA Sampai Nol (Sesi 1)',
                'work_method' => $this->formatWorkMethod([
                    'Membalas seluruh info dan pertanyaan di Cicle &amp; WA hingga notifikasi menunjukkan angka nol',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot notifikasi Cicle menunjukkan 0',
                    'Catatan "Done balas semua chat WA dan Cicle hingga notifikasi nol √"',
                ]),
                'weight' => 1.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Audit Aset Jual (ACC, SP, Saldo, Uang Angsulan, Uang Penjualan)',
                'work_method' => $this->formatWorkMethod([
                    'Print kertas audit, datang ke toko',
                    'Audit ACC, SP, saldo aplikasi, uang angsulan, dan uang penjualan',
                    'Selesaikan masalah saat itu juga, catat rekap plus/minus',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kertas audit setiap halaman',
                    'Rekap plus/minus di kolom komentar kartu tugas',
                    'Catatan "Done audit aset jual √"',
                ]),
                'weight' => 8.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Balas Notifikasi Cicle & WA Sampai Nol (Sesi 2)',
                'work_method' => $this->formatWorkMethod([
                    'Kembali membalas semua notifikasi Cicle &amp; WA hingga nol setelah proses audit',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot notifikasi Cicle 0',
                    'Catatan "Done balas semua chat WA dan Cicle hingga notifikasi nol √"',
                ]),
                'weight' => 1.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Cek ACC & SP Beda Harga / Belum Ada Barcode',
                'work_method' => $this->formatWorkMethod([
                    'Cocokkan harga ACC/SP dengan kertas audit',
                    'Jika beda, koordinasi kurir untuk print &amp; antar barcode hari itu juga',
                    'Jika barang non-OCB tanpa barcode, sita + denda Rp50.000/pcs + SP1',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto produk bermasalah',
                    'Screenshot koordinasi dengan kurir',
                    'Catatan status barcode di kolom komentar kartu tugas',
                ]),
                'weight' => 4.00,
                'sequence_order' => 10,
            ],
            [
                'category' => 'Penataan Toko',
                'task_name' => 'Tata & Cek Rak/Ram ACC Kosong',
                'work_method' => $this->formatWorkMethod([
                    'Tata cantolan ACC rapi (jarak maks selebar jempol)',
                    'Hitung kebutuhan tambahan',
                    'Koordinasi ke tim gudang ACC',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto rak/ram before-after',
                    'Screenshot koordinasi gudang ACC',
                    'Catatan jumlah kebutuhan ACC',
                ]),
                'weight' => 2.00,
                'sequence_order' => 11,
            ],
            [
                'category' => 'Returan',
                'task_name' => 'Cek Barang Returan',
                'work_method' => $this->formatWorkMethod([
                    'Tanyakan ke tim toko barang yang mau diretur',
                    'Buat kartu tugas Returan Barang di Cicle (judul, label, anggota, catatan, lampiran lengkap)',
                    'Cek kondisi sesuai SOP, geser ke Approval Gudang, titipkan ke kurir',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot kartu tugas returan di Cicle',
                    'Foto serah-terima barang ke kurir',
                    'Atau catatan "Done tidak ada barang returan √" jika tidak ada',
                ]),
                'weight' => 4.00,
                'sequence_order' => 12,
            ],
            [
                'category' => 'Pricing',
                'task_name' => 'Cek Kondisi Daftar Harga & Spanduk Angka',
                'work_method' => $this->formatWorkMethod([
                    'Cocokkan harga di aplikasi OCB Dompet Digital vs kertas daftar harga vs spanduk promo',
                    'Jika tidak sesuai, lapor ke Designer OCB untuk perbaikan/cetak ulang lewat kurir',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto daftar harga before-after',
                    'Screenshot chat ke Designer OCB (jika ada perubahan)',
                    'Catatan kondisi daftar harga',
                ]),
                'weight' => 3.00,
                'sequence_order' => 13,
            ],
            [
                'category' => 'Inventory',
                'task_name' => 'Cek ACC, SP & Voucher Kosong yang Dicari Customer',
                'work_method' => $this->formatWorkMethod([
                    'Tanyakan barang yang sering dicari tapi kosong',
                    'Cek toko lain untuk rolling (koordinasi SPV, gudang, kurir, tim toko)',
                    'Update di iPos, atau rekomendasikan ke gudang',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup tambahan barang/bukti rolling',
                    'Catatan rekomendasi ke gudang',
                ]),
                'weight' => 2.00,
                'sequence_order' => 14,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Balas Notifikasi Cicle & WA Sampai Nol (Sesi 3)',
                'work_method' => $this->formatWorkMethod([
                    'Clearing kembali seluruh notifikasi Cicle &amp; WA hingga nol',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot notifikasi Cicle 0',
                    'Catatan "Done balas semua chat WA dan Cicle hingga notifikasi nol √"',
                ]),
                'weight' => 1.00,
                'sequence_order' => 15,
            ],
            [
                'category' => 'Aset',
                'task_name' => 'Audit & Cek Kondisi Aset Lainnya',
                'work_method' => $this->formatWorkMethod([
                    'Data dan foto seluruh aset toko (30+ item: bangunan, etalase, rak, lampu, CCTV, mesin anti gores, dll)',
                    'Nilai kelayakannya',
                    'Perbaikan &lt;40% harga baru bisa langsung dikerjakan SPV (lapor CFO/COO); di atas itu wajib pengajuan ke COO',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto seluruh aset toko + update data aset',
                    'Bukti pengajuan di Cicle Approval Pembelian Aset Leader bila ada',
                ]),
                'weight' => 5.00,
                'sequence_order' => 16,
            ],
            [
                'category' => 'Branding',
                'task_name' => 'Audit & Cek Kondisi Brandingan',
                'work_method' => $this->formatWorkMethod([
                    'Cek kondisi papan nama, segitiga promo, banner, dami, x-banner, dan brandingan brand tertentu',
                    'Perbaiki semampunya, masukkan ke list tim perbaikan jika rusak',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto seluruh brandingan toko',
                    'Catatan "Done audit &amp; cek kondisi brandingan √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 17,
            ],
            [
                'category' => 'Audit',
                'task_name' => 'Cek Form & Hasil Audit Toko',
                'work_method' => $this->formatWorkMethod([
                    'Pastikan kertas audit tanggal 1 s.d. tanggal kunjungan tersimpan rapi dan diisi sungguh-sungguh',
                    'Edukasi tim toko, beri teguran/punishment jika asal-asalan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto tumpukan kertas audit yang sudah dirapikan',
                    'Catatan teguran/punishment (jika ada)',
                ]),
                'weight' => 3.00,
                'sequence_order' => 18,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Balas Notifikasi Cicle & WA Sampai Nol (Sesi 4)',
                'work_method' => $this->formatWorkMethod([
                    'Clearing kembali seluruh notifikasi Cicle &amp; WA hingga nol',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot notifikasi Cicle 0',
                    'Catatan "Done balas semua chat WA dan Cicle hingga notifikasi nol √"',
                ]),
                'weight' => 1.00,
                'sequence_order' => 19,
            ],
            [
                'category' => 'Kebersihan',
                'task_name' => 'Cek Kebersihan & Kerapian Toko',
                'work_method' => $this->formatWorkMethod([
                    'Ajak tim toko membersihkan &amp; merapikan minimal 15 area (halaman, lantai, plafon, etalase, kabel, WC, dll)',
                    'Edukasi jadwal kebersihan rutin',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kondisi toko bersih &amp; rapi (minimal 15 area)',
                    'Catatan "Done toko bersih dan rapi √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 20,
            ],
            [
                'category' => 'Training',
                'task_name' => 'In-Store Training',
                'work_method' => $this->formatWorkMethod([
                    'Lakukan training memakai materi dari Cicle Ruang Tim SPV OCB',
                    'Tes hafalan sales di tempat',
                    'Lalu praktek ke customer minimal 10 kali',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto/video proses training',
                    'Catatan hasil tes hafalan sales',
                ]),
                'weight' => 4.00,
                'sequence_order' => 21,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Cek Absen Kehadiran Shift Malam',
                'work_method' => $this->formatWorkMethod([
                    'Sama seperti shift pagi: tag &amp; telepon jika telat',
                    'Cari pengganti jika lewat 10 menit tanpa kabar',
                    'Balas grup "sudah hadir" dengan Cc lengkap',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup WA absen malam',
                    'Catatan "Done pengecekan Absen Kehadiran Shift Malam √"',
                ]),
                'weight' => 4.00,
                'sequence_order' => 22,
            ],
            [
                'category' => 'Manajemen',
                'task_name' => 'Pengecekan & Penegasan Manajemen Toko',
                'work_method' => $this->formatWorkMethod([
                    'Pastikan aturan toko dibuat &amp; ditempel (in-time, 5S, golden words, upselling, kebersihan, audit)',
                    'Ditandatangani seluruh tim toko + SPV sebagai saksi',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto aturan toko yang sudah tertempel &amp; ditandatangani',
                    'Catatan "Done pengecekan &amp; penegasan manajemen toko √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 23,
            ],
            [
                'category' => 'Marketing',
                'task_name' => 'Mob-Sale',
                'work_method' => $this->formatWorkMethod([
                    'Laksanakan mob-sale rutin minimal 2x/minggu',
                    'Terutama di toko baru atau pencapaian rendah',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto/video pelaksanaan mob-sale',
                ]),
                'weight' => 2.00,
                'sequence_order' => 24,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Cek Laporan Saldo & Setoran Shift Pagi',
                'work_method' => $this->formatWorkMethod([
                    'Sama seperti lajur 4 untuk shift pagi: cek saldo aplikasi vs iPos, kertas setoran',
                    'Tindak lanjuti minus',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap laporan saldo &amp; setoran pagi',
                    'Catatan tindak lanjut minus (jika ada)',
                ]),
                'weight' => 5.00,
                'sequence_order' => 25,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Cek Sales Report – Retail Shift Pagi',
                'work_method' => $this->formatWorkMethod([
                    'Beri reaction &amp; komentar motivasi push target ke laporan retail toko shift pagi',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot komentar SPV di grup sales report pagi',
                ]),
                'weight' => 2.00,
                'sequence_order' => 26,
            ],
            [
                'category' => 'Sales Performance',
                'task_name' => 'Cek Sales Report – Anti Gores Shift Pagi',
                'work_method' => $this->formatWorkMethod([
                    'Beri reaction &amp; komentar motivasi push target Anti Gores shift pagi',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot komentar SPV di grup Anti Gores pagi',
                ]),
                'weight' => 2.00,
                'sequence_order' => 27,
            ],
            [
                'category' => 'Operasional Toko',
                'task_name' => 'Cek Absen Menyalakan Lampu (17.30 WITA)',
                'work_method' => $this->formatWorkMethod([
                    'Cek foto toko depan &amp; Running Text saat menyalakan lampu',
                    'Beri reaction jika sesuai',
                    'Balas grup laporan rekap',
                ], '17.30 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup laporan nyalakan lampu',
                    'Catatan "Done pengecekan Absen Menyalakan Lampu √"',
                ]),
                'weight' => 2.00,
                'sequence_order' => 28,
            ],
            [
                'category' => 'Komunikasi',
                'task_name' => 'Balas Notifikasi Cicle & WA Sampai Nol (Sesi 5)',
                'work_method' => $this->formatWorkMethod([
                    'Clearing final seluruh notifikasi sebelum closing hari',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot notifikasi Cicle 0',
                    'Catatan "Done balas semua chat WA dan Cicle hingga notifikasi nol √"',
                ]),
                'weight' => 1.00,
                'sequence_order' => 29,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Cek Absen Kehadiran Shift Subuh (23.00 WITA)',
                'work_method' => $this->formatWorkMethod([
                    'Sama seperti shift pagi/malam: tag &amp; telepon jika telat',
                    'Cari pengganti jika lewat 10 menit',
                    'Balas grup "sudah hadir" dengan Cc lengkap',
                ], '23.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot grup WA absen subuh',
                    'Catatan "Done pengecekan Absen Kehadiran Shift Subuh √"',
                ]),
                'weight' => 4.00,
                'sequence_order' => 30,
            ],
            [
                'category' => 'Laporan',
                'task_name' => 'Tulis Laporan Kunjungan Harian Lengkap',
                'work_method' => $this->formatWorkMethod([
                    'Isi kolom catatan kartu tugas dengan format Laporan Kunjungan Harian',
                    '(hasil audit, barcode, returan, daftar harga, kebersihan, brandingan, aset, in-store training, aturan toko, mob-sale)',
                    'Upload semua foto/video di lampiran',
                ]),
                'verification_method' => $this->formatVerification([
                    'Kolom catatan &amp; lampiran kartu tugas terisi lengkap sesuai format Laporan Kunjungan Harian',
                ]),
                'weight' => 5.00,
                'sequence_order' => 31,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Pengecekan Laporan Trainingan dari Trainer',
                'work_method' => $this->formatWorkMethod([
                    'Cek laporan Trainer di Cicle terkait training yang dilakukan di toko',
                    'Beri evaluasi dan penilaian terhadap pelaksanaan training tersebut',
                ]),
                'verification_method' => $this->formatVerification([
                    'Catatan evaluasi &amp; penilaian SPV pada lajur Laporan Pengecekan Trainingan di Cicle',
                ]),
                'weight' => 2.00,
                'sequence_order' => 32,
            ],
            [
                'category' => 'Evaluasi',
                'task_name' => 'Geser Kartu Tugas ke Lajur Pengecekan UM Unit 1',
                'work_method' => $this->formatWorkMethod([
                    'Setelah seluruh lajur selesai dan laporan lengkap, geser kartu tugas ke lajur Pengecekan UM Unit 1',
                    'Tag Unit Manager untuk diperiksa',
                ]),
                'verification_method' => $this->formatVerification([
                    'Catatan "Done tugas harian SPV, mohon bantuannya di cek Pak (..nama UM..) √" di kolom komentar kartu tugas',
                ]),
                'weight' => 4.00,
                'sequence_order' => 33,
            ],
            [
                'category' => 'Tindak Lanjut',
                'task_name' => 'Baca, Pahami & Tindak Lanjuti Evaluasi UM (Tugas Selesai)',
                'work_method' => $this->formatWorkMethod([
                    'Setelah dievaluasi oleh UM Unit 1, SPV wajib membaca, memahami, menjawab, dan bertanya terkait evaluasi tersebut',
                    'Sebagai bahan pengembangan diri',
                ]),
                'verification_method' => $this->formatVerification([
                    'Balasan/komentar SPV atas evaluasi UM pada kartu tugas yang sudah berada di lajur Tugas Selesai',
                ]),
                'weight' => 5.00,
                'sequence_order' => 34,
            ],
        ];
    }
}
