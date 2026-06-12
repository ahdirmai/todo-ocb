<?php

namespace Database\Seeders;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use Illuminate\Database\Seeder;

class KpiGudangKurirSeeder extends Seeder
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
        $managerGudang = Position::firstOrCreate(
            ['name' => 'Manager Gudang'],
            ['description' => 'Manager Gudang (Pengawas semua divisi gudang & kurir)'],
        );

        $gudangBjb = Position::firstOrCreate(
            ['name' => 'Gudang BJB'],
            ['description' => 'Divisi A — Gudang BJB (Banjarbaru)'],
        );

        $gudangBjm = Position::firstOrCreate(
            ['name' => 'Gudang BJM'],
            ['description' => 'Divisi B — Gudang BJM (Banjarmasin)'],
        );

        $gudangGesekan = Position::firstOrCreate(
            ['name' => 'Gudang Gesekan'],
            ['description' => 'Divisi C — Gudang Gesekan (Voucher)'],
        );

        $gudangAcc = Position::firstOrCreate(
            ['name' => 'Gudang ACC'],
            ['description' => 'Divisi D — Gudang ACC (Aksesoris)'],
        );

        $kurir = Position::firstOrCreate(
            ['name' => 'Kurir'],
            ['description' => 'Divisi E — Kurir'],
        );

        foreach ([$gudangBjb, $gudangBjm, $gudangGesekan, $gudangAcc, $kurir] as $gudangPosition) {
            PositionPermission::firstOrCreate([
                'position_id' => $gudangPosition->id,
                'route_key' => 'gudang',
            ]);
        }

        // DIVISI MANAGER — MANAGER GUDANG (Pengawas) — Total 100%
        $managerGudangTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Absen Masuk (09.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Absen tepat waktu jam 09.00 WITA',
                    'Sebagai pengawas, wajib jadi contoh disiplin',
                ], 'Setiap hari, maks. 09.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot/foto absen di grup dengan timestamp ≤09.00',
                ]),
                'weight' => 4.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Operasional',
                'task_name' => 'Buka Server',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pagi hari pastikan server menyala normal',
                    'Pastikan server siap untuk transaksi semua divisi',
                ], 'Setiap pagi'),
                'verification_method' => $this->formatVerification([
                    'Screenshot dashboard server menyala normal',
                ]),
                'weight' => 4.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Stock Control',
                'task_name' => 'Kontrol Stock Voucher',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pantau ketersediaan stok voucher cukup untuk kebutuhan harian semua toko',
                    'Antisipasi sebelum habis',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap stok voucher',
                    'Catatan jika perlu restok',
                ]),
                'weight' => 5.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Stock Control',
                'task_name' => 'Kontrol Stock SP (Sim Perdana)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pantau stok SP semua operator cukup',
                    'Koordinasi pengadaan jika menipis',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot stok SP per operator',
                    'Catatan tindak lanjut',
                ]),
                'weight' => 5.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Stock Control',
                'task_name' => 'Kontrol Stock ACC',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pantau stok aksesoris di gudang ACC cukup untuk distribusi ke toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot/laporan stok ACC',
                    'Identifikasi barang menipis',
                ]),
                'weight' => 5.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Purchasing',
                'task_name' => 'Purchasing / Pembelian Barang',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan pembelian/pengadaan barang sesuai kebutuhan stok yang menipis',
                    'Koordinasi dengan keuangan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Bukti PO/pembelian + nota',
                    'Lapor di Cicle ruang purchasing',
                ]),
                'weight' => 6.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Cek Harga HPP & Harga Jual Voucher',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Verifikasi harga HPP (modal) vs harga jual voucher',
                    'Pastikan margin terjaga dan tidak ada kesalahan harga',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot tabel HPP vs harga jual',
                    'Catatan jika ada selisih/perlu update',
                ]),
                'weight' => 6.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Koordinasi',
                'task_name' => 'Koordinasi dengan Supplier',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Komunikasi rutin dengan supplier untuk harga, ketersediaan, dan pengiriman barang',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS chat/email koordinasi supplier',
                    'Ringkasan hasil',
                ]),
                'weight' => 5.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Training',
                'task_name' => 'Mengajari Produk Knowledge 1 Toko/Hari',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap hari ajari/edukasi produk ke minimal 1 toko',
                    'Materi: produk baru, fitur, cara jual',
                ], 'Setiap hari, min. 1 toko'),
                'verification_method' => $this->formatVerification([
                    'Foto/video sesi edukasi',
                    'Nama toko + materi yang diajarkan',
                ]),
                'weight' => 6.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Verifikasi Absen Semua Tim Gudang & Kurir',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan semua tim (Gudang BJB, BJM, Gesekan, ACC, Kurir) sudah absen sesuai jam SOP masing-masing',
                    'Absen tim gudang & tarikan absen kurir harus COCOK dengan detail SOP tiap divisi',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS rekap absen semua divisi',
                    'Cross-check dengan jam SOP',
                    'Tag divisi yang telat',
                ]),
                'weight' => 7.00,
                'sequence_order' => 10,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Awasi Gudang BJB - Sesuai SOP',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan Gudang BJB jalankan semua KPI-nya: server, setoran max 10.00, setoran bank 11.00, gesek 1.500 pcs, tarikan subuh max 06.00',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS bukti dari grup WA BJB (setoran, gesekan, tarikan) + lampirkan',
                    'Verifikasi tiap task terpenuhi',
                ]),
                'weight' => 8.00,
                'sequence_order' => 11,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Awasi Gudang BJM - Sesuai SOP',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan Gudang BJM jalankan KPI: absen 09.00, setoran max 10.00, setoran bank 13.00, pengisian operator, gesek 1.500 pcs, tarikan subuh max 06.00',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS bukti dari grup WA BJM + lampirkan',
                    'Verifikasi tiap task terpenuhi',
                ]),
                'weight' => 8.00,
                'sequence_order' => 12,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Awasi Gudang Voucher/Gesekan - Sesuai SOP',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan Gudang Gesekan jalankan KPI: masuk 09.00, cek stock, foto fisik max 10 menit, gesek 1.500 pcs, invalid <0,5%, voucher masuk iPos',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS bukti rekap gesekan + invalid rate + iPos',
                    'Lampirkan dan verifikasi',
                ]),
                'weight' => 8.00,
                'sequence_order' => 13,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Awasi Gudang ACC - Sesuai SOP',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan Gudang ACC jalankan KPI: absen max 14.00, min. 8 toko/hari, pengantaran 1x24 jam, bukti transfer, kerapian gudang',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS bukti serah terima + transfer iPos + daftar toko dilayani',
                    'Lampirkan',
                ]),
                'weight' => 7.00,
                'sequence_order' => 14,
            ],
            [
                'category' => 'Pengawasan',
                'task_name' => 'Awasi Kurir - Setoran Sebelum 15.00 (Contoh Wajib)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan Kurir sudah setoran sebelum jam 15.00 setiap hari',
                    'Pastikan foto setoran masuk grup + interval setoran max 1 jam terpenuhi',
                ], 'Setiap hari, deadline 15.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'SS grup WA setoran kurir (timestamp ≤15.00) + lampirkan',
                    'Verifikasi interval setoran 1 jam',
                ]),
                'weight' => 8.00,
                'sequence_order' => 15,
            ],
            [
                'category' => 'Reporting',
                'task_name' => 'Rekap Pengawasan Harian & Lapor ke CEO',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Kompilasi status semua divisi (mana yang patuh SOP, mana yang telat/bolos task)',
                    'Buat rekap + action plan',
                    'Kirim ke CEO max 22.00 WITA',
                ], 'Setiap hari, maks. 22.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Dashboard pengawasan harian semua divisi dikirim ke CEO via Cicle sebelum 22.30 WITA',
                ]),
                'weight' => 8.00,
                'sequence_order' => 16,
            ],
        ];

        // DIVISI A — GUDANG BJB (Banjarbaru) — Total 100%
        $gudangBjbTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Absen Masuk',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Absen tepat waktu sesuai jadwal shift gudang BJB',
                    'Tidak boleh telat tanpa kabar',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot absen / foto absen di grup WA gudang BJB',
                ]),
                'weight' => 6.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Operasional Server',
                'task_name' => 'Buka Server & Cek Server/Saldo Server',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pagi hari langsung buka server',
                    'Cek status server hidup normal',
                    'Cek saldo server cukup untuk transaksi hari itu',
                ], 'Setiap pagi'),
                'verification_method' => $this->formatVerification([
                    'Screenshot dashboard server + nominal saldo server',
                    'Lapor di grup jika saldo menipis',
                ]),
                'weight' => 8.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Pengerjaan Setoran/Rekapan (Maks. 10.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Selesaikan setoran & rekapan keuangan shift sebelumnya paling lambat jam 10.00 WITA',
                ], 'Maks. 10.00 WITA — lewat jam = skor 0'),
                'verification_method' => $this->formatVerification([
                    'Foto/SS rekapan selesai + timestamp menunjukkan sebelum 10.00',
                    '<strong>Lewat jam = skor task ini 0</strong>',
                ]),
                'weight' => 9.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Tarikan Pagi + Setoran ke Bank (11.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Tarikan pagi sekalian setoran fisik ke bank jam 11.00 WITA',
                ], 'Jam 11.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Foto bukti setoran bank (slip) + timestamp',
                    'Upload di grup',
                ]),
                'weight' => 9.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Foto Fisik',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Foto fisik uang/stok sesuai prosedur sebagai bukti kecocokan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto fisik jelas + timestamp diupload di grup/Cicle',
                ]),
                'weight' => 6.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Gesekan',
                'task_name' => 'Gesekan - Pantau Otto Stock Realtime',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Saat menggesek, wajib pantau stok di Otto secara realtime agar tidak over/kehabisan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot Otto stock realtime saat gesekan',
                ]),
                'weight' => 7.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Gesekan',
                'task_name' => 'Gesek Otto - Target 1.500 pcs',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Capai target gesekan Otto minimal 1.500 pcs per hari',
                ], 'Target harian ≥1.500 pcs'),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap Otto menunjukkan jumlah gesekan tercapai (≥1.500 pcs)',
                ]),
                'weight' => 12.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Voucher',
                'task_name' => 'Upload Voucher + Penginputan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Upload voucher dan input data voucher ke sistem dengan benar',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti upload + input voucher berhasil',
                ]),
                'weight' => 8.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Voucher',
                'task_name' => 'Pengisian Saldo Supplier',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Isi/top-up saldo supplier sesuai kebutuhan transaksi harian',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti pengisian saldo supplier + nominal',
                ]),
                'weight' => 7.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Voucher',
                'task_name' => 'Otto Balance Voucher',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan balancing voucher di Otto agar stok dan transaksi sinkron',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot hasil balance voucher Otto (selisih 0 atau sesuai)',
                ]),
                'weight' => 7.00,
                'sequence_order' => 10,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Laporan Barang Masuk',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Catat dan laporkan setiap barang masuk ke gudang BJB',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto barang masuk + laporan di Cicle/grup dengan detail jumlah & jenis',
                ]),
                'weight' => 6.00,
                'sequence_order' => 11,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Wajib Minimal 1x Move / Tambahan SP per Hari',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap hari wajib minimal melakukan 1 kali move barang atau tambahan SP (Sim Perdana)',
                ], 'Min. 1x per hari'),
                'verification_method' => $this->formatVerification([
                    'Bukti SS transaksi move/tambahan SP di sistem',
                ]),
                'weight' => 7.00,
                'sequence_order' => 12,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Tarikan Shift Subuh (Maks. 06.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Selesaikan tarikan shift subuh paling lambat jam 06.00 WITA',
                ], 'Maks. 06.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Foto/SS bukti tarikan subuh + timestamp sebelum 06.00',
                ]),
                'weight' => 8.00,
                'sequence_order' => 13,
            ],
        ];

        // DIVISI B — GUDANG BJM (Banjarmasin) — Total 100%
        $gudangBjmTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Absen Masuk (09.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Absen tepat waktu jam 09.00 WITA',
                    'Telat tanpa kabar = catatan',
                ], 'Maks. 09.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot/foto absen di grup WA gudang BJM dengan timestamp',
                ]),
                'weight' => 8.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Pengerjaan Setoran/Rekapan (Maks. 10.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Selesaikan setoran & rekapan paling lambat jam 10.00 WITA',
                ], 'Maks. 10.00 WITA — lewat jam = skor 0'),
                'verification_method' => $this->formatVerification([
                    'Foto/SS rekapan selesai + timestamp sebelum 10.00',
                    '<strong>Lewat jam = skor 0</strong>',
                ]),
                'weight' => 12.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Tarikan Pagi + Setoran ke Bank (13.00 Siang)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Tarikan pagi sekalian setoran fisik ke bank jam 13.00 WITA (01.00 siang)',
                ], 'Jam 13.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Foto slip setoran bank + timestamp',
                    'Upload di grup',
                ]),
                'weight' => 12.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Operasional',
                'task_name' => 'Pengisian All Operator Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Isi/top-up saldo semua operator untuk seluruh toko yang dilayani gudang BJM',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti pengisian semua operator',
                    'Daftar toko terisi',
                ]),
                'weight' => 13.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Gesekan',
                'task_name' => 'Gesek Otto - Target 1.500 pcs/hari (750/shift)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Capai target gesekan Otto 1.500 pcs/hari',
                    'Terbagi 750 pcs per shift',
                ], 'Target ≥750/shift, ≥1.500/hari'),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap Otto per shift (≥750) dan total harian (≥1.500)',
                ]),
                'weight' => 18.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Wajib Minimal 1x Move / Tambahan SP per Hari',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap hari wajib minimal 1 kali move barang atau tambahan SP',
                ], 'Min. 1x per hari'),
                'verification_method' => $this->formatVerification([
                    'Bukti SS transaksi move/tambahan SP di sistem',
                ]),
                'weight' => 10.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Laporan Barang Masuk',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Catat dan laporkan setiap barang masuk ke gudang BJM',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto barang masuk + laporan di Cicle/grup dengan detail',
                ]),
                'weight' => 9.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Keuangan',
                'task_name' => 'Tarikan Shift Subuh (Maks. 06.00 Pagi)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Selesaikan tarikan shift subuh paling lambat jam 06.00 WITA',
                ], 'Maks. 06.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Foto/SS bukti tarikan subuh + timestamp sebelum 06.00',
                ]),
                'weight' => 11.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Disiplin',
                'task_name' => 'Disiplin Waktu Keseluruhan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Pastikan semua deadline harian (10.00, 13.00, 06.00) terpenuhi konsisten',
                ]),
                'verification_method' => $this->formatVerification([
                    'Rekap harian ketepatan waktu semua task',
                    'Tag CEO jika ada kendala',
                ]),
                'weight' => 7.00,
                'sequence_order' => 9,
            ],
        ];

        // DIVISI C — GUDANG GESEKAN — Total 100%
        $gudangGesekanTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Masuk Jam 09.00',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Hadir dan mulai kerja tepat jam 09.00 WITA',
                ], 'Maks. 09.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot/foto absen jam masuk di grup dengan timestamp',
                ]),
                'weight' => 12.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Operasional',
                'task_name' => 'Cek Stock Server',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Cek ketersediaan stok di server sebelum mulai gesekan',
                ], 'Awal shift'),
                'verification_method' => $this->formatVerification([
                    'Screenshot stock server di awal shift',
                ]),
                'weight' => 12.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Operasional',
                'task_name' => 'Foto Fisik (Maks. 10 Menit)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan foto fisik stok/barang',
                    'Selesai maksimal dalam 10 menit dari mulai',
                ], 'Maks. 10 menit dari jam masuk'),
                'verification_method' => $this->formatVerification([
                    'Foto fisik + timestamp menunjukkan ≤10 menit dari jam masuk',
                ]),
                'weight' => 12.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Gesekan',
                'task_name' => 'Gesek 1.500 pcs (750 pcs/shift)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Capai target gesekan 1.500 pcs per hari',
                    '750 pcs per shift',
                ], 'Target ≥750/shift, ≥1.500/hari'),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap gesekan per shift (≥750) dan total (≥1.500)',
                ]),
                'weight' => 28.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Gesekan',
                'task_name' => 'Invalid di Bawah 0,5% dari Total Gesekan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Jaga tingkat invalid/gagal gesek tetap di bawah 0,5% dari total gesekan',
                    'Contoh: dari 1.500 pcs, invalid maksimal 7-8 pcs',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot rekap menunjukkan jumlah invalid',
                    'Perhitungan persentase < 0,5%',
                ]),
                'weight' => 22.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Voucher',
                'task_name' => 'Memasukkan Voucher ke iPos',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Input semua voucher hasil gesekan ke sistem iPos dengan benar',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti voucher masuk ke iPos + jumlah sesuai',
                ]),
                'weight' => 14.00,
                'sequence_order' => 6,
            ],
        ];

        // DIVISI D — GUDANG ACC (Aksesoris) — Total 100%
        $gudangAccTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Absen (Paling Lambat 14.00)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Absen masuk paling lambat jam 14.00 WITA',
                ], 'Maks. 14.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot/foto absen di grup dengan timestamp ≤14.00',
                ]),
                'weight' => 7.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Gudang',
                'task_name' => 'Kerapian & Kebersihan Gudang',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Jaga gudang ACC selalu rapi dan bersih',
                    'Barang tertata sesuai kategori',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto kondisi gudang rapi & bersih sebelum/sesudah kerja',
                ]),
                'weight' => 8.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Menyiapkan / Menambahkan Barang untuk Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Siapkan dan tambahkan barang ACC sesuai permintaan/kebutuhan toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'Daftar barang disiapkan per toko',
                    'SS koordinasi',
                ]),
                'weight' => 12.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Serah Terima Barang',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan serah terima barang ke kurir/toko dengan pencatatan jelas',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto/dokumen serah terima barang ditandatangani',
                ]),
                'weight' => 9.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Bukti Transfer dari Gudang ACC ke Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Setiap pengiriman barang ke toko wajib ada bukti transfer di sistem (iPos)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti transfer iPos dari gudang ke toko tujuan',
                ]),
                'weight' => 11.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Pengantaran Maks. 1x24 Jam di Hari H',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Barang yang diminta toko wajib diantar maksimal 1x24 jam di hari yang sama (Hari H)',
                ], 'Maks. 1x24 jam (Hari H)'),
                'verification_method' => $this->formatVerification([
                    'Bukti pengiriman + timestamp menunjukkan ≤24 jam dari permintaan',
                ]),
                'weight' => 12.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Laporan Barang Masuk dari Ilyas',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Catat dan laporkan setiap barang masuk dari supplier (Ilyas)',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto barang masuk + laporan detail jumlah & jenis di Cicle/grup',
                ]),
                'weight' => 8.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Move Barang Kurang Laku dari Tiap Toko',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Identifikasi dan pindahkan (rolling) barang yang kurang laku dari toko-toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS bukti move barang',
                    'Daftar toko asal & tujuan',
                ]),
                'weight' => 9.00,
                'sequence_order' => 8,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Ganti Toples Toko (2x dalam Sebulan)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Ganti/refresh toples ACC di toko minimal 2 kali dalam sebulan',
                ], 'Min. 2x per bulan'),
                'verification_method' => $this->formatVerification([
                    'Foto before-after toples',
                    'Jadwal penggantian per toko',
                ]),
                'weight' => 6.00,
                'sequence_order' => 9,
            ],
            [
                'category' => 'Distribusi',
                'task_name' => 'Minimal 8 Toko dalam 1 Hari',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Layani/kunjungi/suplai minimal 8 toko dalam satu hari kerja',
                ], 'Min. 8 toko per hari'),
                'verification_method' => $this->formatVerification([
                    'Daftar 8 toko yang dilayani hari itu + bukti per toko',
                ]),
                'weight' => 18.00,
                'sequence_order' => 10,
            ],
        ];

        // DIVISI E — KURIR — Total 100%
        $kurirTasks = [
            [
                'category' => 'Absensi',
                'task_name' => 'Absen Masuk (Maks. 14.00)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Absen paling lambat jam 14.00 WITA setiap hari',
                ], 'Maks. 14.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Screenshot/foto absen di grup WA kurir dengan timestamp ≤14.00',
                ]),
                'weight' => 10.00,
                'sequence_order' => 1,
            ],
            [
                'category' => 'Absensi',
                'task_name' => 'Absen Tarikan di Grup',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan absen tarikan dan laporkan di grup WA tarikan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Screenshot bukti absen tarikan di grup',
                ]),
                'weight' => 12.00,
                'sequence_order' => 2,
            ],
            [
                'category' => 'Serah Terima',
                'task_name' => 'Serah Terima Kertas Tarikan',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan serah terima berupa kertas tarikan dengan pencatatan jelas',
                ]),
                'verification_method' => $this->formatVerification([
                    'Foto bukti serah terima kertas tarikan dengan nama & tanda tangan',
                ]),
                'weight' => 12.00,
                'sequence_order' => 3,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Foto Absen Setoran di Grup WA (Maks. 15.00)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Upload foto absen setoran masuk grup WA',
                    'Paling lambat jam 15.00 WITA',
                ], 'Maks. 15.00 WITA'),
                'verification_method' => $this->formatVerification([
                    'Foto setoran masuk grup dengan timestamp ≤15.00',
                    'Verifikasi interval setoran 1 jam',
                ]),
                'weight' => 14.00,
                'sequence_order' => 4,
            ],
            [
                'category' => 'Logistik',
                'task_name' => 'Foto Absen di Hari H (Maks. 02.00)',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Foto absen wajib di hari H sebelum jam 02.00 WITA keesokan harinya',
                ], 'Maks. 02.00 WITA (keesokan hari)'),
                'verification_method' => $this->formatVerification([
                    'Foto absen + timestamp ≤02.00 di hari berikutnya',
                ]),
                'weight' => 13.00,
                'sequence_order' => 5,
            ],
            [
                'category' => 'Responsivitas',
                'task_name' => 'Maksiimal 1 Jam 1x Setoran',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Lakukan setoran rutin minimal 1 kali setiap jam',
                    'Tidak boleh menumpuk >1 jam tanpa setoran',
                ], 'Interval maks. 1 jam antar setoran'),
                'verification_method' => $this->formatVerification([
                    'Rekap setoran menunjukkan interval maksimal 1 jam tidak terlewat',
                ]),
                'weight' => 18.00,
                'sequence_order' => 6,
            ],
            [
                'category' => 'Koordinasi',
                'task_name' => 'Pengantaran Tepat Waktu & Aman',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Antar setiap barang/dokumen tepat waktu dalam kondisi aman tanpa kerusakan',
                ]),
                'verification_method' => $this->formatVerification([
                    'Bukti pengiriman + konfirmasi penerima',
                    'Catatan jika ada kendala',
                ]),
                'weight' => 11.00,
                'sequence_order' => 7,
            ],
            [
                'category' => 'Koordinasi',
                'task_name' => 'Koordinasi & Responsif di Grup',
                'work_method' => $this->formatWorkMethod('Langkah Kerja', [
                    'Selalu responsif di grup WA',
                    'Balas instruksi cepat, koordinasi dengan gudang & toko',
                ]),
                'verification_method' => $this->formatVerification([
                    'SS chat menunjukkan response time cepat + koordinasi aktif',
                ]),
                'weight' => 10.00,
                'sequence_order' => 8,
            ],
        ];

        $groups = [
            [$managerGudang, $managerGudangTasks],
            [$gudangBjb, $gudangBjbTasks],
            [$gudangBjm, $gudangBjmTasks],
            [$gudangGesekan, $gudangGesekanTasks],
            [$gudangAcc, $gudangAccTasks],
            [$kurir, $kurirTasks],
        ];

        foreach ($groups as [$position, $tasks]) {
            foreach ($tasks as $task) {
                KpiTaskDefinition::updateOrCreate(
                    [
                        'position_id' => $position->id,
                        'task_name' => $task['task_name'],
                    ],
                    array_merge($task, ['is_active' => true]),
                );
            }
        }
    }
}
