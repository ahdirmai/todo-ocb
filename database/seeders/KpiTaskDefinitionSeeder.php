<?php

namespace Database\Seeders;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Illuminate\Database\Seeder;

class KpiTaskDefinitionSeeder extends Seeder
{
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
            ['category' => 'Audit', 'task_name' => 'Audit Toko Ruang Tim SPV (Random 3 Toko)', 'description' => null, 'work_method' => 'Senin-Kamis jam 11.00 WITA. Pilih random 3 toko (store in store, denda, SP). Koordinasi dengan SPV untuk siapkan barang. Fokus ke laporan SPV dan barang ready.', 'verification_method' => 'SS grup laporan random 3 toko + cek fisik barang ready di toko. Tag CEO setiap selesai audit harus ada feedback ke toko.', 'weight' => 5.00, 'sequence_order' => 1],
            ['category' => 'Audit', 'task_name' => 'Audit Produk Expired (Random 1 Toko)', 'description' => null, 'work_method' => 'Jum\'at jam 11.00 WITA. Cek produk WAJIB dicek. Koordinasi dengan SPV untuk siapkan barang.', 'verification_method' => 'SS grup laporan random 1 toko. Feedback tertulis ke toko.', 'weight' => 5.00, 'sequence_order' => 2],
            ['category' => 'Audit', 'task_name' => 'Audit Cek Barang Retur (Seminggu sekali random 1 Toko)', 'description' => null, 'work_method' => 'Cek barang retur ke gudang (rusak atau cacat). Koordinasi dengan gudang.', 'verification_method' => 'SS barang retur yang sudah di cek + feedback ke toko.', 'weight' => 5.00, 'sequence_order' => 3],

            // Absensi (12%)
            ['category' => 'Absensi', 'task_name' => 'Monitoring Absensi Harian 3 Shift', 'description' => null, 'work_method' => 'Pagi (07-08), Malam (15-16), Subuh (23.00). Cross-plan check absen 210 karyawan vs jadwal shift. Identifikasi yang tidak hadir >10 menit. Koordinasi dengan SPV untuk tindakan urgent jika karyawan tidak hadir.', 'verification_method' => 'Rekap harian absensi (Excel/Cicle). Bukti SS dari grup absen WA 3 shift.', 'weight' => 10.00, 'sequence_order' => 4],
            ['category' => 'Absensi', 'task_name' => 'Laporan Keterlambatan & Sakit ke CEO', 'description' => null, 'work_method' => 'Pagi: rekap keterlambatan shift pagi/malam. Kirim ke CEO. Jum\'at: rekap mingguan karyawan sakit.', 'verification_method' => 'Rekap keterlambatan dikirim ke CEO via WA. Rekap mingguan karyawan sakit.', 'weight' => 2.00, 'sequence_order' => 5],

            // Keuangan (10%)
            ['category' => 'Keuangan', 'task_name' => 'Cek Target & Laporan Penjualan Toko', 'description' => null, 'work_method' => 'Cek target sales vs actual harian setiap toko. Monitor SPV yang di bawah target.', 'verification_method' => 'Dashboard penjualan harian. Screenshot laporan penjualan per toko.', 'weight' => 5.00, 'sequence_order' => 6],
            ['category' => 'Keuangan', 'task_name' => 'Monitoring Transfer Kas Toko ke HO', 'description' => null, 'work_method' => 'Cek transfer kas dari toko ke HO setiap hari. Pastikan sesuai closing toko.', 'verification_method' => 'Bukti transfer + rekap kas harian.', 'weight' => 5.00, 'sequence_order' => 7],

            // Sales Performance (8%)
            ['category' => 'Sales Performance', 'task_name' => 'Monitor Kinerja Sales (Sales Report Retail & Anti Gores)', 'description' => null, 'work_method' => 'Tarik rekap sales per karyawan dari laporan shift pagi/malam/subuh. Identifikasi top performer (untuk reward) dan low performer (untuk coaching).', 'verification_method' => 'Excel rekap sales harian per karyawan. Update mingguan ranking.', 'weight' => 8.00, 'sequence_order' => 8],

            // Training (6%)
            ['category' => 'Training', 'task_name' => 'Verifikasi Pelaksanaan In-Store Training (Aturan Toko Tertempel)', 'description' => null, 'work_method' => 'Setiap SPV wajib lakukan in-store training tiap kunjungan toko. HR pastikan materi (dari Cicle Ruang Tim SPV) dipraktekkan, sales hafal, dan praktek minimal 10x ke customer.', 'verification_method' => 'Laporan training dari SPV. Tes hafalan random ke sales. Rekap mingguan per toko.', 'weight' => 6.00, 'sequence_order' => 9],

            // Komunikasi (5%)
            ['category' => 'Komunikasi', 'task_name' => 'Briefing Pagi dengan Tim SPV', 'description' => null, 'work_method' => 'Senin-Sabtu jam 08.30 WITA. Review kondisi toko kemarin, target hari ini, motivasi tim. Durasi max 30 menit.', 'verification_method' => 'Screenshot daftar hadir meeting + notulen meeting tersimpan di Cicle. Tag CEO setiap selesai meeting.', 'weight' => 5.00, 'sequence_order' => 10],

            // Aset (5%)
            ['category' => 'Aset', 'task_name' => 'Cek Kebersihan, Kerapian, dan Aset Pribadi Karyawan di Toko', 'description' => null, 'work_method' => 'Dari laporan SPV lajur 20 (kebersihan toko). Cek barang pribadi karyawan. Pastikan tidak ada penyimpangan (barang tidak wajar atau pelanggaran).', 'verification_method' => 'Foto kondisi toko dari SPV. Catatan jika ada temuan.', 'weight' => 5.00, 'sequence_order' => 11],

            // Laporan (5%)
            ['category' => 'Laporan', 'task_name' => 'Verifikasi Laporan Matikan & Nyalakan Lampu (Disiplin Toko)', 'description' => null, 'work_method' => 'Cek 37 toko sudah lapor matikan lampu 06.00 dan laporan tim toko yang telat berangkat. Koordinasi dengan SPV untuk cek toko yang sering telat.', 'verification_method' => 'SS grup laporan lampu pagi & sore. Rekap toko yang sering telat.', 'weight' => 5.00, 'sequence_order' => 12],

            // Reporting (5%)
            ['category' => 'Reporting', 'task_name' => 'Rekap Harian & Lapor ke CEO', 'description' => null, 'work_method' => 'Buat dashboard harian: jumlah hadir/telat/alpha, SP baru, minus karyawan, top/low performer, training selesai, hasil meeting pagi. Kirim ke CEO setiap hari jam 22.00 WITA.', 'verification_method' => 'Dashboard HR harian dikirim ke CEO sebelum 22.30 WITA via Cicle.', 'weight' => 5.00, 'sequence_order' => 13],

            // Operasional Toko (4%)
            ['category' => 'Operasional Toko', 'task_name' => 'Setup Harian Toko (Aturan Toko & SOP)', 'description' => null, 'work_method' => 'Pastikan semua toko punya aturan toko terpampang (laminating). Update SOP jika ada perubahan. Kirim ke grup toko tiap ada perubahan.', 'verification_method' => 'Foto aturan toko terpampang dari SPV. Rekap update SOP.', 'weight' => 4.00, 'sequence_order' => 14],

            // Returan (4%)
            ['category' => 'Returan', 'task_name' => 'Tidak Lanjut Returan Barang (Tanggung Jawab Karyawan)', 'description' => null, 'work_method' => 'Barang rusak yang tidak sesuai SOP returan = beban tim toko. HR pastikan minus tercatat dan dipotong sesuai aturan.', 'verification_method' => 'Cek kartu tugas Returan Barang di Cicle. Database minus karyawan.', 'weight' => 4.00, 'sequence_order' => 15],

            // Evaluasi (4%)
            ['category' => 'Evaluasi', 'task_name' => 'Evaluasi Akhir Kartu Tugas SPV → Geser ke Tugas Selesai [Evaluasi]', 'description' => null, 'work_method' => 'Sebagai Unit Manager / pengawas, cek menyuruh laporan SPV. Beri evaluasi tertulis di kolom komentar. Geser kartu ke "Tugas Selesai".', 'verification_method' => 'Setiap kartu SPV yang selesai harus ada komentar evaluasi Manager Operasional + sudah di lajur Tugas Selesai.', 'weight' => 4.00, 'sequence_order' => 16],

            // Pricing (3%)
            ['category' => 'Pricing', 'task_name' => 'Update Harga & Promo Toko', 'description' => null, 'work_method' => 'Kirim update harga baru atau promo ke grup WA toko. Pastikan SPV edukasi ke sales.', 'verification_method' => 'SS WA grup update harga. Konfirmasi SPV sudah edukasi sales.', 'weight' => 3.00, 'sequence_order' => 17],

            // Setup Harian (2%)
            ['category' => 'Setup Harian', 'task_name' => 'Monitoring Setup Toko Pagi (Sebelum Buka)', 'description' => null, 'work_method' => 'Cek laporan setup toko dari SPV sebelum jam 09.00 WITA. Pastikan semua toko ready.', 'verification_method' => 'Laporan setup toko dari SPV. Tag CEO jika ada toko yang belum ready.', 'weight' => 2.00, 'sequence_order' => 18],

            // Penataan Toko (2%)
            ['category' => 'Penataan Toko', 'task_name' => 'Cek Penataan Produk & Display Toko', 'description' => null, 'work_method' => 'Dari laporan SPV, cek foto penataan produk. Pastikan sesuai standar visual merchandising.', 'verification_method' => 'Foto display toko dari SPV. Feedback jika ada yang perlu diperbaiki.', 'weight' => 2.00, 'sequence_order' => 19],

            // Inventory (2%)
            ['category' => 'Inventory', 'task_name' => 'Monitoring Stok Barang Toko', 'description' => null, 'work_method' => 'Cek laporan stok dari SPV. Pastikan tidak ada stok mati atau over stock.', 'verification_method' => 'Laporan stok dari SPV. Rekomendasi jika ada stok yang perlu direorder.', 'weight' => 2.00, 'sequence_order' => 20],

            // Branding (2%)
            ['category' => 'Branding', 'task_name' => 'Update Branding & Material Promosi Toko', 'description' => null, 'work_method' => 'Kirim material branding baru (poster, banner) ke toko. Pastikan dipasang.', 'verification_method' => 'Foto branding terpasang dari SPV.', 'weight' => 2.00, 'sequence_order' => 21],

            // Kebersihan (2%)
            ['category' => 'Kebersihan', 'task_name' => 'Monitoring Kebersihan Toko Harian', 'description' => null, 'work_method' => 'Cek laporan kebersihan toko dari SPV. Pastikan toko selalu bersih.', 'verification_method' => 'Foto kebersihan toko dari SPV. Feedback jika ada yang perlu diperbaiki.', 'weight' => 2.00, 'sequence_order' => 22],

            // Manajemen (2%)
            ['category' => 'Manajemen', 'task_name' => 'Koordinasi dengan Tim Gudang & Logistik', 'description' => null, 'work_method' => 'Koordinasi harian dengan gudang untuk pengiriman barang ke toko.', 'verification_method' => 'Laporan koordinasi dengan gudang.', 'weight' => 2.00, 'sequence_order' => 23],

            // Marketing (2%)
            ['category' => 'Marketing', 'task_name' => 'Koordinasi Kampanye Marketing dengan Tim', 'description' => null, 'work_method' => 'Koordinasi dengan tim marketing untuk kampanye promosi di toko.', 'verification_method' => 'Laporan koordinasi kampanye marketing.', 'weight' => 2.00, 'sequence_order' => 24],

            // Additional tasks from PDF pages to reach 34 tasks total
            ['category' => 'Audit', 'task_name' => 'Audit Cash Flow Harian Toko', 'description' => null, 'work_method' => 'Cek laporan cash flow dari kasir. Pastikan tidak ada selisih kas.', 'verification_method' => 'Laporan cash flow harian. Tag CEO jika ada selisih > 50rb.', 'weight' => 2.00, 'sequence_order' => 25],
            ['category' => 'Absensi', 'task_name' => 'Follow Up Karyawan Alpha Tanpa Kabar', 'description' => null, 'work_method' => 'Hubungi karyawan yang alpha tanpa kabar. Koordinasi dengan SPV untuk investigasi.', 'verification_method' => 'Laporan investigasi + tindakan yang diambil.', 'weight' => 2.00, 'sequence_order' => 26],
            ['category' => 'Keuangan', 'task_name' => 'Verifikasi Laporan Pengeluaran Operasional Toko', 'description' => null, 'work_method' => 'Cek laporan pengeluaran operasional toko. Pastikan sesuai budget.', 'verification_method' => 'Laporan pengeluaran + bukti pembayaran.', 'weight' => 2.00, 'sequence_order' => 27],
            ['category' => 'Sales Performance', 'task_name' => 'Tracking Target Bulanan per Toko', 'description' => null, 'work_method' => 'Monitor progress target bulanan setiap toko. Update dashboard weekly.', 'verification_method' => 'Dashboard target bulanan. Update setiap Senin.', 'weight' => 2.00, 'sequence_order' => 28],
            ['category' => 'Training', 'task_name' => 'Evaluasi Efektivitas Training Sales', 'description' => null, 'work_method' => 'Cek improvement sales setelah training. Compare sales before & after.', 'verification_method' => 'Report sales comparison. Tes hafalan sales.', 'weight' => 2.00, 'sequence_order' => 29],
            ['category' => 'Komunikasi', 'task_name' => 'Koordinasi dengan CEO untuk Update Kebijakan', 'description' => null, 'work_method' => 'Meeting dengan CEO untuk update kebijakan operasional. Durasi max 30 menit.', 'verification_method' => 'Notulen meeting + action items.', 'weight' => 1.00, 'sequence_order' => 30],
            ['category' => 'Aset', 'task_name' => 'Monitoring Kondisi Aset Toko (AC, Lemari Es, dll)', 'description' => null, 'work_method' => 'Cek laporan kondisi aset dari SPV. Koordinasi perbaikan jika ada kerusakan.', 'verification_method' => 'Laporan kondisi aset + foto jika ada kerusakan.', 'weight' => 1.00, 'sequence_order' => 31],
            ['category' => 'Laporan', 'task_name' => 'Verifikasi Kelengkapan Dokumen Administrasi Toko', 'description' => null, 'work_method' => 'Cek kelengkapan dokumen administrasi toko (izin, pajak, dll).', 'verification_method' => 'Checklist dokumen administrasi.', 'weight' => 1.00, 'sequence_order' => 32],
            ['category' => 'Reporting', 'task_name' => 'Buat Laporan Mingguan untuk Review CEO', 'description' => null, 'work_method' => 'Kompilasi data mingguan (sales, absensi, training, audit). Kirim setiap Senin pagi.', 'verification_method' => 'Laporan mingguan dikirim ke CEO sebelum jam 10.00 WITA.', 'weight' => 1.00, 'sequence_order' => 33],
            ['category' => 'Evaluasi', 'task_name' => 'Review Performance SPV Bulanan', 'description' => null, 'work_method' => 'Evaluasi kinerja SPV setiap bulan. Meeting 1-on-1 untuk feedback.', 'verification_method' => 'Form evaluasi SPV + notulen meeting.', 'weight' => 1.00, 'sequence_order' => 34],
        ];

        // Manager HR Tasks (16 tasks)
        $managerHRTasks = [
            // Meeting Pagi (8%)
            ['category' => 'Meeting Pagi', 'task_name' => 'Memimpin Meeting Pagi Harian (Senin-Sabtu)', 'description' => null, 'work_method' => 'Senin-Kamis & Sabtu jam 11.00 WITA. Khusus Jum\'at jam 10.00 WITA. WAJIB hadir tepat waktu (toleransi max 5 menit). Agenda: review absensi kemarin, masalah toko, action plan hari ini, motivasi tim. Durasi max 30 menit, fokus & terstruktur.', 'verification_method' => 'Screenshot daftar hadir meeting (Zoom/WA/offline) + notulen meeting tersimpan di Cicle. Tag CEO setiap selesai meeting dengan ringkasan poin utama.', 'weight' => 8.00, 'sequence_order' => 1],

            // Absensi (10%)
            ['category' => 'Absensi', 'task_name' => 'Monitoring Absensi Harian 3 Shift', 'description' => null, 'work_method' => 'Pagi (07-08), Malam (15-16), Subuh (23.00). Cross-plan check absen 210 karyawan vs jadwal shift. Identifikasi yang tidak hadir >10 menit. Koordinasi dengan SPV untuk pengganti urgent jika karyawan tidak hadir.', 'verification_method' => 'Rekap harian absensi (Excel/Cicle). Bukti SS dari grup absen WA 3 shift.', 'weight' => 10.00, 'sequence_order' => 2],

            // Disiplin (10%)
            ['category' => 'Disiplin', 'task_name' => 'Verifikasi Laporan Matikan & Nyalakan Lampu (Disiplin Toko)', 'description' => null, 'work_method' => 'Cek 37 toko sudah lapor matikan lampu 06.00 dan laporan tim toko yang telat berangkat. Rekap catatan disiplin tim (dari Cicle Ruang Tim SPV) yang telat berangkat dan terima saliran.', 'verification_method' => 'SS grup laporan lampu pagi & sore. Rekap toko yang sering telat.', 'weight' => 4.00, 'sequence_order' => 3],

            // Disiplin (continued)
            ['category' => 'Disiplin', 'task_name' => 'Tracking Pemberian SP1/SP2/SP3', 'description' => null, 'work_method' => 'Catat setiap SP yang dikeluarkan SPV (contoh: SP1 untuk store-in-store, denda, SP). Update di file HR. Pastikan karyawan tanda-tangan dan terima salinan.', 'verification_method' => 'Database SP karyawan (Excel/Cicle). Scan dokumen SP yang ditandatangani.', 'weight' => 6.00, 'sequence_order' => 4],

            // SOP (4%)
            ['category' => 'SOP', 'task_name' => 'Monitoring Kepatuhan SOP Toko (Aturan Toko Tertempel)', 'description' => null, 'work_method' => 'Pastikan setiap toko punya aturan toko ditanda-tangani tim toko & ada dokumen SP karyawan. Cek setiap minggu update apa belum.', 'verification_method' => 'Foto aturan toko dari SPV. Database 37 toko: ada/tidak.', 'weight' => 4.00, 'sequence_order' => 5],

            // Training (12%)
            ['category' => 'Training', 'task_name' => 'Verifikasi Pelaksanaan In-Store Training (Aturan Toko Tertempel)', 'description' => null, 'work_method' => 'Setiap SPV wajib lakukan in-store training tiap kunjungan toko. HR pastikan materi (dari Cicle Ruang Tim SPV) dipraktekkan, sales hafal, dan praktek minimal 10x ke customer.', 'verification_method' => 'Laporan training dari SPV. Tes hafalan random ke sales. Rekap mingguan per toko.', 'weight' => 8.00, 'sequence_order' => 6],

            // Training (continued)
            ['category' => 'Training', 'task_name' => 'Evaluasi Trainer & Trainingan', 'description' => null, 'work_method' => 'Cek laporan Trainer di Cicle. Beri evaluasi setiap training selesai. Identifikasi trainer yang under-perform untuk pembenahan.', 'verification_method' => 'Cek lajur Laporan Pengecekan Trainingan di Cicle. Catatan evaluasi tertulis.', 'weight' => 4.00, 'sequence_order' => 7],

            // Performance (8%)
            ['category' => 'Performance', 'task_name' => 'Monitor Kinerja Sales (Sales Report Retail & Anti Gores)', 'description' => null, 'work_method' => 'Tarik rekap sales per karyawan dari laporan shift pagi/malam/subuh. Identifikasi top performer (untuk reward) dan low performer (untuk coaching).', 'verification_method' => 'Excel rekap sales harian per karyawan. Update mingguan ranking.', 'weight' => 8.00, 'sequence_order' => 8],

            // Compliance (24%)
            ['category' => 'Compliance', 'task_name' => 'Identifikasi & Tindak Lanjut Karyawan dengan Minus/Selisih Setoran [Compliance]', 'description' => null, 'work_method' => 'Cek laporan saldo & setoran (lajur 4 & 25 SPV). Karyawan dengan minus berulung = panggil untuk investigasi (kebocoran, kesalahan kasir, atau penyalahgunaan).', 'verification_method' => 'Database karyawan + frekuensi minus. Catatan hasil interview/investigasi.', 'weight' => 10.00, 'sequence_order' => 9],

            // Compliance (continued)
            ['category' => 'Compliance', 'task_name' => 'Rekap Audit Toko per Karyawan [Compliance]', 'description' => null, 'work_method' => 'Audit toko (lajur 8 SPV) menunjukkan plus/minus aset per toko. HR cross-check siapa shift saat barang hilang. Track akumulasi minus per karyawan untuk evaluasi bulanan.', 'verification_method' => 'Database audit per toko per shift. Laporan akumulasi minus per karyawan untuk evaluasi bulanan.', 'weight' => 7.00, 'sequence_order' => 10],

            // Compliance (continued)
            ['category' => 'Compliance', 'task_name' => 'Tidak Lanjut Returan Barang (Tanggung Jawab Karyawan) [Compliance]', 'description' => null, 'work_method' => 'Barang rusak yang tidak sesuai SOP returan = beban tim toko. HR pastikan minus tercatat dan dipotong sesuai aturan.', 'verification_method' => 'Cek kartu tugas Returan Barang di Cicle. Database minus karyawan.', 'weight' => 4.00, 'sequence_order' => 11],

            // Compliance (continued)
            ['category' => 'Compliance', 'task_name' => 'Cek Kebersihan, Kerapian, dan Aset Pribadi Karyawan di Toko [Compliance]', 'description' => null, 'work_method' => 'Dari laporan SPV lajur 20 (kebersihan toko), cek barang pribadi karyawan. Pastikan ada penyimpangan (barang tidak wajar atau pelanggaran).', 'verification_method' => 'Foto kondisi toko dari SPV. Catatan jika ada temuan.', 'weight' => 3.00, 'sequence_order' => 12],

            // Rekrutmen (7%)
            ['category' => 'Rekrutmen', 'task_name' => 'Rekrutmen & Pengganti Urgent', 'description' => null, 'work_method' => 'Jika lajur absen SPV menunjukkan karyawan resign tanpa kabar >10 menit, HR siapkan pool pengganti urgent. Update database calon karyawan.', 'verification_method' => 'Database pool pengganti. Catatan response time setiap kasus urgent.', 'weight' => 7.00, 'sequence_order' => 13],

            // Database (4%)
            ['category' => 'Database', 'task_name' => 'Update Database Karyawan', 'description' => null, 'work_method' => '210 karyawan: data pribadi, kontak darurat, jadwal shift, area toko, riwayat SP, riwayat training, evaluasi.', 'verification_method' => 'Database HR (Cicle / Excel cloud). Update real-time setiap perubahan.', 'weight' => 4.00, 'sequence_order' => 14],

            // Reporting (10%)
            ['category' => 'Reporting', 'task_name' => 'Rekap Harian HR & Lapor ke CEO', 'description' => null, 'work_method' => 'Buat dashboard harian: jumlah hadir/telat/alpha, SP baru, minus karyawan, top/low performer, training selesai, hasil meeting pagi. Kirim ke CEO setiap hari jam 22.00 WITA.', 'verification_method' => 'Dashboard HR harian dikirim ke CEO sebelum 22.30 WITA via Cicle.', 'weight' => 10.00, 'sequence_order' => 15],

            // Engagement (3%)
            ['category' => 'Engagement', 'task_name' => 'Koordinasi Mob-Sale (Engagement Karyawan) [Engagement]', 'description' => null, 'work_method' => 'Mob-sale (lajur 24) butuh partisipasi tim toko. HR pastikan rotasi adil, semua sales kebagian giliran, dan ada evaluasi mingguan.', 'verification_method' => 'Jadwal mob-sale per toko. Bukti foto/video pelaksanaan.', 'weight' => 3.00, 'sequence_order' => 16],
        ];

        // Insert Manager Operasional tasks
        foreach ($managerOpsTasks as $task) {
            KpiTaskDefinition::create(array_merge($task, ['position_id' => $managerOps->id, 'is_active' => true]));
        }

        // Insert Manager HR tasks
        foreach ($managerHRTasks as $task) {
            KpiTaskDefinition::create(array_merge($task, ['position_id' => $managerHR->id, 'is_active' => true]));
        }
    }
}
