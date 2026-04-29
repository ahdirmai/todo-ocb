# SPV UNIT 1 AUDIT SKILL - QUICK START

**Version:** 1.0.0  
**Status:** ✅ PRODUCTION READY  
**Last Updated:** Tue 2026-04-28 16:40 GMT+8  

---

## QUICK START

### Run Full Audit (30 seconds)
```bash
cd skills/spv-unit1-audit
node audit-spv-unit1-keyword-matching.js
```

**Output:**
- JSON report: `audit-spv-unit1-keyword-matching-2026-04-28.json`
- Console: Summary statistics

### Generate Excel Report
```bash
node export-final-excel-organized.js
```

**Output:**
- Excel file: `audit-spv-unit1-organized-2026-04-28.xlsx`
- 3 sheets: DETAIL TASK, RINGKASAN SVP, STATISTIK

---

## FILES IN THIS DIRECTORY

| File | Purpose |
|------|---------|
| `SKILL.md` | Complete methodology & reference ✅ |
| `README.md` | This quick start guide |
| `AUDIT_METHODOLOGY.md` | Detailed algorithm documentation |
| `audit-spv-unit1-keyword-matching.js` | Main audit script (PRODUCTION) |
| `export-final-excel-organized.js` | Excel export script (PRODUCTION) |

---

## METHODOLOGY AT A GLANCE

**Algorithm:** Keyword Matching + Evidence-Based Scoring

**Column 1:** Always Score 10 (inisiasi/PIC)  
**Columns 2-33:** Matched from comment keywords

**Scoring:**
- **10:** Comment match + attachment (evidence) ✅
- **6:** Comment match only (📝)
- **3:** Empty + previous has content (⏭️)
- **0:** Empty total (❌)

**Formula:**
```
compliance % = (total_score / 330) × 100

Quality:
  >= 165: SANGAT BAIK
  >= 99:  BAIK
  < 99:   BURUK
```

---

## EXAMPLE OUTPUT

**JSON (audit-spv-unit1-keyword-matching.js):**
```json
{
  "nama": "Sinari",
  "breakdown_task": [{
    "nama_task": "OC7, 23 APRIL 2026",
    "total_komentar": 11,
    "compliance_persen": "72.7",
    "quality": "SANGAT BAIK",
    "breakdown_jalur": [
      {"no": 1, "jalur": "PIC...", "skor": 10},
      {"no": 2, "jalur": "Cek Absen...", "skor": 10, "comments": [...]}
    ]
  }]
}
```

**Excel (export-final-excel-organized.js):**
- Sheet 1: 30 tasks × 33 columns, grouped by SVP & date
- Sheet 2: 6 SVPs ranked by compliance
- Sheet 3: Metrics & scoring rules

---

## KEY STATS (Latest Run)

| Metric | Value |
|--------|-------|
| Total Tasks | 30 |
| Total SVPs | 6 |
| Total Columns | 33 |
| Overall Compliance | 72.9% |
| SANGAT BAIK | 28 (93.3%) |
| BAIK | 1 (3.3%) |
| BURUK | 1 (3.3%) |

**Top SVP:** Rizkiah (82.3%)  
**Bottom SVP:** Aditya Rahman (60.8%)

---

## RULES (LOCKED - DO NOT CHANGE)

1. Column 1 = ALWAYS 10 (no exceptions)
2. Keyword matching = CASE-INSENSITIVE
3. Column words score DOUBLE
4. Each comment → ONLY ONE column
5. No points without evidence
6. Max score = 330 (fixed)

---

## DEPENDENCIES

- **API:** Kanban Task Management (localhost:8888)
- **Team:** SPV UNIT 1 (019da952-d23a-72af-bb21-cfdc5b29926d)
- **Node.js:** v14+ (http, exceljs)
- **NPM:** `npm install exceljs` (if not already installed)

---

## FUTURE CUSTOMIZATION

To adapt this skill for OTHER TEAMS:

1. **Change team ID:**
   ```javascript
   const TEAM_ID = 'your-team-id-here';
   ```

2. **Update column names:**
   ```javascript
   const COLUMN_NAMES = [
     "Your Column 1",
     "Your Column 2",
     // ... 33 columns total
   ];
   ```

3. **Run same scripts** - methodology adapts automatically!

---

## SUPPORT & QUESTIONS

**Documentation:** Read `SKILL.md` for complete reference  
**Methodology:** See `AUDIT_METHODOLOGY.md` for detailed algorithm  
**Latest Results:** Check latest JSON/Excel reports for data  

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-28 | Initial release - Keyword matching methodology |

---

**Status:** ✅ VERIFIED & LOCKED  
**Last Verified:** Tue 2026-04-28 16:40 GMT+8  
**Approved by:** dha
