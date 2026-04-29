# AUDIT METHODOLOGY - SPV UNIT 1 (FINAL & CORRECT)

**Date Created:** 2026-04-28  
**Status:** ✅ VERIFIED & LOCKED  
**Approved by:** dha  

---

## METHODOLOGY: KEYWORD MATCHING + EVIDENCE SCORING

### Overview
Score calculation untuk setiap task berdasarkan:
1. Column 1 = ALWAYS Score 10 (inisiasi/PIC)
2. Column 2-33 = Berdasarkan keyword matching di comments
3. Scoring per column sesuai evidence (attachment/comment)

---

## STEP-BY-STEP ALGORITHM

### Step 1: Parse Comments
- Ambil semua comments dari task
- Extract content (plain text, remove HTML)
- Setiap comment adalah satu unit evaluasi

### Step 2: Keyword Matching
**Untuk setiap comment, cari matching column:**

```
For each comment:
  - Extract keywords dari content (split by space, filter < 3 chars)
  - For each column name:
    - Count keyword matches (case-insensitive)
    - Weight: column name keywords score DOUBLE
    - Score = sum(matched_keyword_lengths)
  - Assign comment ke column dengan highest score
  - If no match found (score = 0), comment di-skip
```

**Example:**
```
Comment: "Cek barang retur ✅ Tidak ada barang yang di retur"
Keywords: ["cek", "barang", "retur", "tidak", "ada", "yang", "retur"]

Column match scoring:
- "Cek Barang Returan": score = high (cek, barang, returan match)
- "Cek Absen...": score = low (hanya "cek" match)
- Others: score = 0

Result: Comment → Column "Cek Barang Returan"
```

### Step 3: Score Each Column

```
For each column (1-33):
  If column = 1:
    score = 10 (auto inisiasi)
  Else:
    matching_comments = comments assigned to this column
    
    If matching_comments.length > 0:
      has_attachment = any(comment.attachments.length > 0)
      
      If has_attachment:
        score = 10 (komentar + foto/evidence)
      Else:
        score = 6 (komentar only, no evidence)
    Else:
      If column_index > 0 AND previous_column_score > 0:
        score = 3 (kosong tapi ada sebelumnya = skip/not documented)
      Else:
        score = 0 (benar-benar kosong)
```

### Step 4: Calculate Task Score

```
total_score = sum(all column scores)
max_score = 33 columns × 10 = 330
percentage = (total_score / 330) × 100

If percentage >= 165:
  quality = "SANGAT BAIK"
Else if percentage >= 99:
  quality = "BAIK"
Else:
  quality = "BURUK"
```

---

## SCORING RULES (LOCKED)

| Score | Condition | Meaning |
|-------|-----------|---------|
| **10** | Matching comment + attachment | Perfect: Evidence + Documentation ✅ |
| **6** | Matching comment + NO attachment | Good: Work done but no proof 📝 |
| **3** | NO comment + previous has content | Skip: Not documented but task progressed ⏭️ |
| **0** | NO comment + NO previous content | Bad: Not done or missing ❌ |

---

## KEY RULES (DO NOT CHANGE)

1. **Column 1 is always 10** - No exceptions (inisiasi/PIC adalah fondasi)
2. **Keyword matching is case-insensitive** - "Cek" = "cek" = "CEK"
3. **Column name words score double** - Prioritize exact column names
4. **Assignment is 1:1** - Each comment assigned to ONLY ONE best-matching column
5. **No comments = score 0 or 3** - Never give points without evidence
6. **Max score is always 330** - Never scales based on comment count

---

## COLUMNS REFERENCE (33 JALURS)

```
1. PIC, TUJUAN, DAN TGL KUNJUNGAN (auto 10)
2. Cek Absen Kehadiran Shift Pagi
3. Cek Absen Matikan Lampu
4. Cek Laporan Saldo & Setoran Shift Malam & Subuh
5. Cek Sales Report - Retail Shift Malam & Subuh
6. Cek Sales Report - Anti Gores Shift Malam & Subuh
7. Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (1)
8. Audit Aset Jual
9. Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (2)
10. Barang Beda atau Belum Ada Barcode
11. Tata & Cek Jumlah Rak atau Ram Acc Yang Kosong
12. Cek Barang Returan
13. Cek Kondisi Daftar Harga & Spanduk Angka
14. Barang Kosong Yang Banyak Dicari Customer
15. Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (3)
16. Audit & Cek Kondisi Aset Lainnya
17. Audit & Cek Kondisi Brandingan
18. Cek Form dan Hasil Audit Toko
19. Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (4)
20. Cek Kebersihan dan Kerapian Toko
21. In-Store Training
22. Cek Absen Kehadiran Shift Malam
23. Pengecekan dan Penegasan Manajemen Toko
24. Mob-Sale
25. Cek Laporan Saldo & Setoran Shift Pagi
26. Cek Sales Report - Retail Shift Pagi
27. Cek Sales Report - Anti Gores Shift Pagi
28. Cek Absen Menyalakan Lampu
29. Balas Semua Notifikasi Talenta, Cicle, & WA Sampai Nol (5)
30. Cek Absen Kehadiran Shift Subuh
31. Singkronisasi Sales Report Retail
32. Daily Brieving Online SPV
33. PENGECEKAN TIM PENILAI KPI
```

---

## OUTPUT FORMAT (JSON)

```json
{
  "nama": "SVP Name",
  "posisi": "SPV Unit 1",
  "jumlah_task": 1,
  "total_score": 240,
  "skor_maksimal": 330,
  "rata_rata": 240,
  "breakdown_task": [{
    "nama_task": "OC7, 23 APRIL 2026",
    "task_id": "OC7_23_APRIL_2026",
    "kolom_saat_ini": "PIC, TUJUAN, DAN TGL KUNJUNGAN",
    "total_komentar": 11,
    "total_attachment": 18,
    "skor_total_task": 240,
    "skor_maksimal_task": 330,
    "compliance_persen": "72.7",
    "quality": "SANGAT BAIK",
    "breakdown_jalur": [
      {
        "no": 1,
        "jalur": "PIC, TUJUAN, DAN TGL KUNJUNGAN",
        "skor": 10,
        "alasan": "Auto (inisiasi/PIC)",
        "comments": []
      },
      {
        "no": 2,
        "jalur": "Cek Absen Kehadiran Shift Pagi",
        "skor": 10,
        "alasan": "Komentar + Foto (1 comments, 2 files)",
        "comments": [{
          "no": 1,
          "author": "Sinari",
          "content": "Cek absen shift pagi, semua staff hadir tepat waktu...",
          "attachments_count": 2,
          "created_at": "2026-04-23T08:15:00Z"
        }]
      }
    ]
  }]
}
```

---

## VERIFICATION CHECKLIST

- [x] Column 1 always score 10
- [x] Keyword matching algorithm implemented
- [x] Evidence-based scoring (10/6/3/0)
- [x] Comments properly matched to columns
- [x] Attachments detected and counted
- [x] Quality classification (SANGAT BAIK/BAIK/BURUK)
- [x] JSON output format correct
- [x] Tested on OC7 and all 30 tasks

---

## LAST VERIFIED

**Date:** 2026-04-28 16:34 GMT+8  
**By:** dha  
**Result:** ✅ CORRECT - 72.9% Overall Compliance  
**Status:** LOCKED & READY FOR PRODUCTION
