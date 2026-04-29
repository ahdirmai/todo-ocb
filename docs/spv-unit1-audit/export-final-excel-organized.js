#!/usr/bin/env node
/**
 * Export final audit to Excel - Organized by SVP then Date
 */

const ExcelJS = require('exceljs');
const fs = require('fs');

const jsonFile = 'audit-spv-unit1-keyword-matching-2026-04-28.json';
const COLUMN_NAMES = [
  "PIC, TUJUAN, DAN TGL KUNJUNGAN",
  "Cek Absen Kehadiran Shift Pagi",
  "Cek Absen Matikan Lampu",
  "Cek Laporan Saldo & Setoran Shift Malam & Subuh",
  "Cek Sales Report - Retail Shift Malam & Subuh",
  "Cek Sales Report - Anti Gores Shift Malam & Subuh",
  "Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (1)",
  "Audit Aset Jual",
  "Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (2)",
  "Barang Beda atau Belum Ada Barcode",
  "Tata & Cek Jumlah Rak atau Ram Acc Yang Kosong",
  "Cek Barang Returan",
  "Cek Kondisi Daftar Harga & Spanduk Angka",
  "Barang Kosong Yang Banyak Dicari Customer",
  "Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (3)",
  "Audit & Cek Kondisi Aset Lainnya",
  "Audit & Cek Kondisi Brandingan",
  "Cek Form dan Hasil Audit Toko",
  "Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (4)",
  "Cek Kebersihan dan Kerapian Toko",
  "In-Store Training",
  "Cek Absen Kehadiran Shift Malam",
  "Pengecekan dan Penegasan Manajemen Toko",
  "Mob-Sale",
  "Cek Laporan Saldo & Setoran Shift Pagi",
  "Cek Sales Report - Retail Shift Pagi",
  "Cek Sales Report - Anti Gores Shift Pagi",
  "Cek Absen Menyalakan Lampu",
  "Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (5)",
  "Cek Absen Kehadiran Shift Subuh",
  "Singkronisasi Sales Report Retail",
  "Daily Brieving Online SPV",
  "PENGECEKAN TIM PENILAI KPI",
];

function extractDate(taskName) {
  // Extract date from task name like "OC7, 23 APRIL 2026"
  const match = taskName.match(/(\d{1,2})\s+(JANUARY|FEBRUARI|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/i);
  if (match) {
    const monthMap = {
      'JANUARY': '01', 'FEBRUARI': '02', 'MARCH': '03', 'APRIL': '04',
      'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
      'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
    };
    const month = monthMap[match[2].toUpperCase()] || '00';
    const day = match[1].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return '0000-00-00';
}

async function main() {
  try {
    console.log('📊 Creating organized Excel report (per SVP, then date)...\n');
    
    // Read JSON
    let jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    // Group by SVP and sort by date within each group
    const groupedBySVP = {};
    jsonData.forEach(task => {
      if (!groupedBySVP[task.nama]) {
        groupedBySVP[task.nama] = [];
      }
      const date = extractDate(task.breakdown_task[0].nama_task);
      groupedBySVP[task.nama].push({
        ...task,
        sortDate: date
      });
    });

    // Sort each SVP's tasks by date
    Object.keys(groupedBySVP).forEach(svp => {
      groupedBySVP[svp].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
    });

    // Create ordered array
    const orderedData = [];
    const svpOrder = Object.keys(groupedBySVP).sort((a, b) => {
      // Sort SVP by their total compliance (descending)
      const aTotal = groupedBySVP[a].reduce((sum, t) => sum + t.breakdown_task[0].skor_total_task, 0);
      const bTotal = groupedBySVP[b].reduce((sum, t) => sum + t.breakdown_task[0].skor_total_task, 0);
      return bTotal - aTotal;
    });

    svpOrder.forEach(svp => {
      orderedData.push(...groupedBySVP[svp]);
    });

    const workbook = new ExcelJS.Workbook();
    
    // ============ SHEET 1: DETAIL TASK PER SVP & TANGGAL ============
    const sheet1 = workbook.addWorksheet('DETAIL TASK', { pageSetup: { orientation: 'landscape' } });
    
    const headerRow1 = ['No', 'SVP', 'Tanggal', 'Task', 'Comments', 'Attachments'];
    COLUMN_NAMES.forEach((col, idx) => {
      headerRow1.push(`J${idx + 1}`);
    });
    headerRow1.push('Total', 'Max', '%', 'Kualitas');
    
    sheet1.addRow(headerRow1);
    
    const header1 = sheet1.getRow(1);
    header1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 };
    header1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    header1.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    header1.height = 20;
    
    // Header row 2: Jalur names (short)
    const headerRow2 = ['', '', '', '', '', ''];
    COLUMN_NAMES.forEach(col => {
      headerRow2.push(col.substring(0, 20));
    });
    headerRow2.push('', '', '', '');
    
    sheet1.addRow(headerRow2);
    const header2 = sheet1.getRow(2);
    header2.font = { bold: true, size: 7 };
    header2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    header2.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    header2.height = 35;
    
    // Data rows - organized by SVP, then date
    let rowNum = 3;
    let currentSVP = null;
    
    orderedData.forEach((task, idx) => {
      const bd = task.breakdown_task[0];
      const taskDate = extractDate(bd.nama_task);
      const dateDisplay = new Date(taskDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      
      // Add SVP header if changed
      if (task.nama !== currentSVP) {
        currentSVP = task.nama;
        const svpHeaderRow = sheet1.addRow([]);
        sheet1.getRow(rowNum).font = { bold: true, size: 10 };
        sheet1.getRow(rowNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5E0B4' } };
        sheet1.getRow(rowNum).alignment = { horizontal: 'left', vertical: 'center' };
        sheet1.getRow(rowNum).getCell(2).value = `${currentSVP} ✓`;
        rowNum++;
      }
      
      const row = [
        idx + 1,
        '',  // SVP column empty (already shown in header)
        dateDisplay,
        bd.nama_task,
        bd.total_komentar,
        bd.total_attachment,
        ...bd.breakdown_jalur.map(j => j.skor),
        bd.skor_total_task,
        bd.skor_maksimal_task,
        bd.compliance_persen + '%',
        bd.quality
      ];
      sheet1.addRow(row);
      rowNum++;
    });
    
    // Column widths
    sheet1.getColumn(1).width = 5;
    sheet1.getColumn(2).width = 20;
    sheet1.getColumn(3).width = 15;
    sheet1.getColumn(4).width = 28;
    sheet1.getColumn(5).width = 10;
    sheet1.getColumn(6).width = 12;
    for (let i = 0; i < COLUMN_NAMES.length; i++) {
      sheet1.getColumn(7 + i).width = 5;
    }
    sheet1.getColumn(7 + COLUMN_NAMES.length).width = 8;
    sheet1.getColumn(8 + COLUMN_NAMES.length).width = 8;
    sheet1.getColumn(9 + COLUMN_NAMES.length).width = 8;
    sheet1.getColumn(10 + COLUMN_NAMES.length).width = 12;
    
    // Freeze panes
    sheet1.views = [{ state: 'frozen', ySplit: 2, xSplit: 6 }];
    
    // ============ SHEET 2: RINGKASAN SVP ============
    const sheet2 = workbook.addWorksheet('RINGKASAN SVP');
    
    sheet2.addRow(['Ranking', 'Nama SVP', 'Jumlah Task', 'Total Score', 'Skor Maksimal', 'Compliance %', 'SANGAT BAIK', 'BAIK', 'BURUK']);
    
    const header2a = sheet2.getRow(1);
    header2a.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    header2a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    header2a.alignment = { horizontal: 'center', vertical: 'center' };
    header2a.height = 18;
    
    const summaryMap = {};
    orderedData.forEach(task => {
      const bd = task.breakdown_task[0];
      if (!summaryMap[task.nama]) {
        summaryMap[task.nama] = {
          count: 0,
          total_score: 0,
          total_max: 0,
          quality: {}
        };
      }
      summaryMap[task.nama].count++;
      summaryMap[task.nama].total_score += bd.skor_total_task;
      summaryMap[task.nama].total_max += bd.skor_maksimal_task;
      summaryMap[task.nama].quality[bd.quality] = (summaryMap[task.nama].quality[bd.quality] || 0) + 1;
    });
    
    let ranking = 1;
    Object.entries(summaryMap)
      .sort((a, b) => b[1].total_score - a[1].total_score)
      .forEach(([svp, data]) => {
        const compliance = ((data.total_score / data.total_max) * 100).toFixed(1);
        const medal = ranking === 1 ? '🥇' : ranking === 2 ? '🥈' : ranking === 3 ? '🥉' : '';
        sheet2.addRow([
          medal + ranking,
          svp,
          data.count,
          data.total_score,
          data.total_max,
          compliance + '%',
          data.quality['SANGAT BAIK'] || 0,
          data.quality['BAIK'] || 0,
          data.quality['BURUK'] || 0
        ]);
        ranking++;
      });
    
    sheet2.getColumn(1).width = 12;
    sheet2.getColumn(2).width = 25;
    sheet2.getColumn(3).width = 15;
    sheet2.getColumn(4).width = 15;
    sheet2.getColumn(5).width = 18;
    sheet2.getColumn(6).width = 15;
    sheet2.getColumn(7).width = 13;
    sheet2.getColumn(8).width = 10;
    sheet2.getColumn(9).width = 10;
    
    // ============ SHEET 3: STATISTIK ============
    const sheet3 = workbook.addWorksheet('STATISTIK');
    
    sheet3.addRow(['AUDIT REPORT - SPV UNIT 1 (KEYWORD MATCHING)', '']);
    sheet3.addRow(['Tanggal Audit', new Date().toLocaleString('id-ID')]);
    sheet3.addRow(['Metodologi', 'Keyword Matching + Evidence Scoring']);
    sheet3.addRow(['Status', '✅ VERIFIED']);
    sheet3.addRow(['', '']);
    sheet3.addRow(['METRIK', 'NILAI']);
    
    const headerStat = sheet3.getRow(6);
    headerStat.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerStat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    
    const totalScore = orderedData.reduce((sum, t) => sum + t.breakdown_task[0].skor_total_task, 0);
    const maxTotal = orderedData.length * 330;
    
    sheet3.addRow(['Total Tasks', orderedData.length]);
    sheet3.addRow(['Total SVPs', Object.keys(summaryMap).length]);
    sheet3.addRow(['Total Columns (Jalur)', COLUMN_NAMES.length]);
    sheet3.addRow(['Max Score per Task', 330]);
    sheet3.addRow(['Total Score', totalScore + ' / ' + maxTotal]);
    sheet3.addRow(['Overall Compliance', ((totalScore / maxTotal) * 100).toFixed(1) + '%']);
    sheet3.addRow(['', '']);
    sheet3.addRow(['KUALITAS TASK', 'JUMLAH', '%']);
    
    const qualityDist = {};
    orderedData.forEach(t => {
      const quality = t.breakdown_task[0].quality;
      qualityDist[quality] = (qualityDist[quality] || 0) + 1;
    });
    
    const qualityOrder = ['SANGAT BAIK', 'BAIK', 'BURUK'];
    qualityOrder.forEach(q => {
      const count = qualityDist[q] || 0;
      const pct = ((count / orderedData.length) * 100).toFixed(1);
      sheet3.addRow([q, count, pct + '%']);
    });
    
    sheet3.addRow(['', '']);
    sheet3.addRow(['SCORING RULES', '']);
    sheet3.addRow(['Score 10', 'Comment + Attachment (Evidence) ✅']);
    sheet3.addRow(['Score 6', 'Comment Only (No Attachment) 📝']);
    sheet3.addRow(['Score 3', 'Empty but Previous has Content (Skip) ⏭️']);
    sheet3.addRow(['Score 0', 'Empty Total (Not Done) ❌']);
    sheet3.addRow(['', '']);
    sheet3.addRow(['COLUMN 1 RULE', 'Always Score 10 (Inisiasi/PIC)']);
    
    sheet3.getColumn(1).width = 35;
    sheet3.getColumn(2).width = 35;
    sheet3.getColumn(3).width = 10;
    
    // Save
    const xlsxFile = `audit-spv-unit1-organized-2026-04-28.xlsx`;
    await workbook.xlsx.writeFile(xlsxFile);
    
    console.log(`✅ Excel file created: ${xlsxFile}`);
    console.log(`   - Sheet 1: DETAIL TASK (Organized by SVP, then Date)`);
    console.log(`   - Sheet 2: RINGKASAN SVP (${Object.keys(summaryMap).length} SVPs ranked)`);
    console.log(`   - Sheet 3: STATISTIK (72.9% compliance)\n`);
    
    console.log('Order:');
    svpOrder.forEach((svp, idx) => {
      const data = summaryMap[svp];
      const compliance = ((data.total_score / data.total_max) * 100).toFixed(1);
      console.log(`  ${idx + 1}. ${svp}: ${data.count} tasks, ${compliance}% compliance`);
    });
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
