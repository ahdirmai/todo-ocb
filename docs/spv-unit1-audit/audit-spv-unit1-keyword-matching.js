#!/usr/bin/env node
/**
 * SPV UNIT 1 - CORRECT METHOD: KEYWORD MATCHING
 * 
 * CORRECT LOGIC:
 * 1. Baca CONTENT setiap comment
 * 2. MATCH dengan nama column/jalur (keyword/text matching)
 * 3. Comment yang match → map ke column itu
 * 4. Scoring:
 *    - Score 10: Comment match + ada attachment
 *    - Score 6: Comment match + NO attachment
 *    - Score 3: Column tidak ada matching comment tapi column sebelumnya ada
 *    - Score 0: Benar-benar kosong
 */

const http = require('http');
const fs = require('fs');

const API_BASE = 'http://localhost:8888/api';
const TEAM_ID = '019da952-d23a-72af-bb21-cfdc5b29926d';

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

async function fetchAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getTasks() {
  const response = await fetchAPI(`${API_BASE}/teams/${TEAM_ID}/tasks?per_page=100`);
  return response.data || [];
}

async function getTaskDetail(taskId) {
  try {
    const response = await fetchAPI(`${API_BASE}/tasks/${taskId}`);
    return response.data || response;
  } catch (error) {
    return null;
  }
}

// Match comment to column by keyword
function findMatchingColumn(commentContent) {
  const content = commentContent.toLowerCase();
  
  // Extract keywords from content
  const keywords = content.split(/[\s,✅]/g).filter(w => w.length > 2);
  
  // Score each column based on keyword matches
  let bestMatch = -1;
  let bestScore = 0;
  
  COLUMN_NAMES.forEach((col, idx) => {
    const colLower = col.toLowerCase();
    let matchScore = 0;
    
    // Check if any keywords match column name
    keywords.forEach(kw => {
      if (colLower.includes(kw)) {
        matchScore += kw.length; // Longer matches score higher
      }
    });
    
    // Also check if column name keywords are in comment
    col.split(/[\s&]/g).forEach(colWord => {
      const colWordLower = colWord.toLowerCase();
      if (colWordLower.length > 2 && content.includes(colWordLower)) {
        matchScore += colWordLower.length * 2; // Column words score double
      }
    });
    
    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = idx;
    }
  });
  
  return bestScore > 0 ? bestMatch : -1;
}

// Score per column dengan keyword matching
function scorePerColumn(task) {
  const comments = task.comments || [];
  const scores = new Array(COLUMN_NAMES.length).fill(-1); // -1 = not assigned
  const breakdownJalur = [];
  const commentsByColumn = {};

  // COLUMN 1 = AUTO SCORE 10 (inisiasi)
  scores[0] = 10;
  commentsByColumn[0] = [];

  if (comments.length === 0) {
    // Kosong dari column 2 seterusnya
    for (let idx = 1; idx < COLUMN_NAMES.length; idx++) {
      scores[idx] = 0;
      commentsByColumn[idx] = [];
    }
  } else {
    // Match each comment to column by keyword
    comments.forEach(comment => {
      const content = (comment.content || '').replace(/<[^>]*>/g, '');
      const matchingColIdx = findMatchingColumn(content);
      
      if (matchingColIdx >= 0 && matchingColIdx > 0) { // Skip column 0 (already assigned)
        if (!commentsByColumn[matchingColIdx]) {
          commentsByColumn[matchingColIdx] = [];
        }
        commentsByColumn[matchingColIdx].push(comment);
      }
    });

    // Score columns based on matching comments
    let lastHasContent = true;
    for (let idx = 1; idx < COLUMN_NAMES.length; idx++) {
      const colComments = commentsByColumn[idx] || [];
      
      if (colComments.length > 0) {
        // Ada matching comment untuk column ini
        const hasAttachment = colComments.some(c => c.attachments && c.attachments.length > 0);
        scores[idx] = hasAttachment ? 10 : 6;
        lastHasContent = true;
      } else {
        // Tidak ada matching comment
        scores[idx] = lastHasContent ? 3 : 0;
      }
    }
  }

  // Calculate total and build breakdown
  let totalScore = 0;
  for (let idx = 0; idx < COLUMN_NAMES.length; idx++) {
    const score = scores[idx] === -1 ? 0 : scores[idx];
    const colComments = commentsByColumn[idx] || [];
    
    totalScore += score;
    
    let alasan = "";
    if (idx === 0) {
      alasan = "Auto (inisiasi/PIC)";
    } else if (colComments.length > 0) {
      const hasAttachment = colComments.some(c => c.attachments && c.attachments.length > 0);
      alasan = hasAttachment ? `Komentar + Foto (${colComments.length} comments, ${colComments.reduce((s, c) => s + (c.attachments?.length || 0), 0)} files)` : `Hanya Komentar (${colComments.length} comments)`;
    } else {
      if (idx > 0 && scores[idx - 1] > 0) {
        alasan = "Kosong tapi column sebelumnya ada";
      } else {
        alasan = "Tidak ada komentar";
      }
    }
    
    breakdownJalur.push({
      no: idx + 1,
      jalur: COLUMN_NAMES[idx],
      skor: score,
      alasan: alasan,
      comments: colComments.map(c => ({
        no: 1,
        author: c.user?.name || 'Unknown',
        content: (c.content || '').replace(/<[^>]*>/g, '').substring(0, 150),
        attachments_count: c.attachments ? c.attachments.length : 0,
        created_at: c.created_at || 'N/A'
      }))
    });
  }

  // Determine quality
  let quality = 'BURUK';
  if (totalScore >= 10 && totalScore < 99) quality = 'BURUK';
  if (totalScore >= 99 && totalScore < 165) quality = 'BAIK';
  if (totalScore >= 165) quality = 'SANGAT BAIK';

  return { scores, breakdownJalur, total: totalScore, quality };
}

async function main() {
  console.log('\n📊 Creating audit - Keyword matching...\n');
  
  try {
    console.log('[1/3] Loading data...');
    const tasks = await getTasks();
    console.log(`  ✓ ${tasks.length} tasks\n`);
    
    console.log('[2/3] Fetching & scoring...');
    const tasksWithDetail = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const detail = await getTaskDetail(task.id);
      
      if (detail) {
        tasksWithDetail.push({
          ...task,
          ...detail,
          comments: detail.comments || []
        });
      }
      
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`  ${i + 1}/${tasks.length}\r`);
      }
    }
    console.log(`  ✓ Selesai\n`);
    
    console.log('[3/3] Building JSON...');
    const reportData = tasksWithDetail.map(task => {
      const scoring = scorePerColumn(task);
      
      return {
        nama: task.assignees && task.assignees[0] ? task.assignees[0].name : 'N/A',
        posisi: "SPV Unit 1",
        jumlah_task: 1,
        total_score: scoring.total,
        skor_maksimal: COLUMN_NAMES.length * 10,
        rata_rata: scoring.total,
        breakdown_task: [{
          nama_task: task.title,
          task_id: task.title.replace(/[^a-z0-9]/gi, '_'),
          kolom_saat_ini: COLUMN_NAMES[0],
          total_komentar: task.comments.length,
          total_attachment: task.comments.reduce((sum, c) => sum + (c.attachments?.length || 0), 0),
          skor_total_task: scoring.total,
          skor_maksimal_task: COLUMN_NAMES.length * 10,
          compliance_persen: ((scoring.total / (COLUMN_NAMES.length * 10)) * 100).toFixed(1),
          quality: scoring.quality,
          breakdown_jalur: scoring.breakdownJalur
        }]
      };
    });
    
    const jsonFile = `audit-spv-unit1-keyword-matching-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(reportData, null, 2));
    
    console.log(`  ✓ Selesai\n`);
    
    // Display summary
    console.log('═'.repeat(100));
    console.log('📊 AUDIT SUMMARY (Keyword Matching)');
    console.log('═'.repeat(100) + '\n');
    
    const stats = reportData.reduce((acc, task) => {
      const bd = task.breakdown_task[0];
      const quality = bd.quality;
      acc.qualities[quality] = (acc.qualities[quality] || 0) + 1;
      acc.totalScore += bd.skor_total_task;
      return acc;
    }, { qualities: {}, totalScore: 0 });
    
    const maxTotal = reportData.length * (COLUMN_NAMES.length * 10);
    
    console.log(`Total Tasks: ${reportData.length}`);
    console.log(`Total Score: ${stats.totalScore} / ${maxTotal}`);
    console.log(`Overall Compliance: ${((stats.totalScore / maxTotal) * 100).toFixed(1)}%\n`);
    
    console.log('Quality Distribution:');
    Object.entries(stats.qualities)
      .sort((a, b) => b[1] - a[1])
      .forEach(([quality, count]) => {
        const pct = ((count / reportData.length) * 100).toFixed(1);
        console.log(`  • ${quality}: ${count} tasks (${pct}%)`);
      });
    
    console.log('\n' + '═'.repeat(100));
    console.log(`✅ JSON Report: ${jsonFile}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
