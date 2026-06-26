## Tujuan

Setiap startup punya **Financial Dashboard** ala referensi KerabaTani: super admin upload Excel laporan keuangan, AI membaca & mengisi model keuangan terstruktur, lalu super admin bisa koreksi angka secara manual. Tampil sebagai tab **Financials** di halaman detail startup. Judge bisa melihat (read-only).

## Keputusan (dari tanya-jawab)

- Input: **AI ekstrak dari Excel + editable manual** oleh super admin.
- Format Excel: diusahakan baku, tapi AI tetap fleksibel + ada insight tambahan; metrik kunci (mis. YoY) **wajib tervisualisasi sebagai chart**.
- Isi: **KPI & growth**, **cash health**, **unit economics** (AI isi default + admin bisa tambah kartu custom), **verdict + skor + risiko AI**.
- Periode fleksibel **2–5 tahun**.
- Penempatan: **tab Financials**, mata uang **fleksibel** (Rp / USD, diatur admin).
- Akses: super admin input/edit; **semua judge lihat read-only**.

## Struktur data (1 objek `financial_data` JSONB per startup)

```text
FinancialModel {
  currency: "IDR" | "USD"        unit: "juta" | "ribu" | "penuh"
  periods: [{ label:"2024", kind:"actual"|"projected" }]   // 2–5
  series: {
    revenue:[], ebitda:[], netIncome:[],
    grossMarginPct:[], ebitdaMarginPct:[],
    ocf:[], icf:[], fcf:[]        // arus kas operasi/investasi/pendanaan
  }
  kpis: { revenueCagrPct, grossMarginLatestPct, ebitdaLatest,
          ruleOf40, burnMultiple, paybackMonths,
          endingCash, totalFunding, capitalEfficiency }   // null bila tak ada
  unitEconomics: [{ label, value, unit, note }]           // AI isi default
  customCards:  [{ id, label, value, unit, note }]        // admin tambah
  verdict: { score:0-100, headline, narrative, risks:[string] }
  insights: [string]                                       // catatan AI tambahan
}
```

Status disimpan di kolom yang sudah ada: `financial_status` (pending/processing/done/error), `financial_summary`, `financial_error`, `financial_generated_at`, `financial_data`.

## Langkah implementasi

### 1. Database (migrasi)
- Tambah kolom `financial_currency text default 'IDR'` (opsional; bisa juga disimpan dalam `financial_data` — akan dipakai dalam JSONB untuk kesederhanaan, jadi kemungkinan **tanpa kolom baru**).
- Tidak ada tabel baru. RLS startups yang ada sudah cukup: admin full, judge SELECT untuk status open/closed — dashboard otomatis mengikuti aturan ini.

### 2. Ekstraksi Excel (server-only)
- Tambah parsing `.xlsx` di `src/lib/curation/extract.server.ts` (atau file `financial-extract.server.ts`) memakai SheetJS (`xlsx`, pure-JS, kompatibel Worker) → ubah semua sheet jadi teks CSV ringkas untuk diumpankan ke AI. Juga dukung Excel via `financial_report_path` yang sudah diupload.

### 3. Mesin AI (server-only)
- `src/lib/curation/financial-eval.server.ts`: kirim teks Excel + deskripsi startup ke Lovable AI Gateway (Gemini) dengan **structured/JSON output** sesuai skema `FinancialModel` di atas. Termasuk menghitung CAGR, Rule of 40, burn multiple, payback, dan menyusun verdict (skor 0–100, narasi, risiko due diligence) + kartu unit economics sesuai sektor.

### 4. Server functions (`financial.functions.ts`)
- `generateFinancialFromExcel` (admin): terima file Excel (atau pakai report tersimpan) → ekstrak → AI → simpan ke `financial_data`, set `financial_status='done'`, `financial_generated_at`.
- `saveFinancialModel` (admin): simpan hasil edit manual (semua angka, kartu custom, verdict).
- `getFinancialModel`: baca model (dipakai judge & admin; RLS membatasi).
- Semua pakai `requireSupabaseAuth` + cek `has_role(admin)` untuk mutasi.

### 5. UI — tab Financials di `startups.$id.tsx`
- Tambah sistem tab di halaman detail: **Overview** (konten existing) + **Financials**.
- Komponen baru `FinancialDashboard`:
  - **Hero KPI grid**: revenue total, CAGR, gross margin, EBITDA, payback, Rule of 40 (kartu mono seperti referensi).
  - **Chart YoY** (Recharts): Revenue/EBITDA/Net Income (bar/line), ekspansi margin (line), arus kas operasi/investasi/pendanaan (bar). Periode mengikuti jumlah tahun (2–5).
  - **Cash health**: ending cash, total funding, OCF terbaru.
  - **Unit economics**: kartu dari AI + kartu custom admin.
  - **Verdict block** (dark/`bg-foreground`): skor besar 0–100, headline, narasi, daftar risiko.
- **Mode admin**: tombol "Upload Excel & generate", lalu form edit (input angka + slider untuk skor verdict, sama pola seperti override AI yang sudah ada), tambah/hapus kartu custom, pilih mata uang & unit. Tombol simpan memanggil `saveFinancialModel`.
- **Mode judge**: read-only, tanpa kontrol edit.
- State kosong: bila belum ada `financial_data`, judge melihat "Belum ada data keuangan"; admin melihat CTA upload.

### 6. Konsistensi desain
- Ikuti memory desain: Plus Jakarta Sans + JetBrains Mono (`mono-num`/`mono-label`), kartu rounded-2xl, hairline border, token warna semantik (primary biru #1652F0, foreground ink), satu momen dark untuk verdict. Tanpa warna hardcoded.

## Detail teknis
- `xlsx` (SheetJS) ditambahkan via `bun add xlsx`; parsing hanya di file server-only.
- Chart memakai Recharts yang sudah dipakai project (CategoryRadar) — tidak menambah Chart.js.
- AI memakai `LOVABLE_API_KEY` lewat gateway, dipanggil di dalam handler server function.
- Angka di-format id-ID (Rp juta/M) atau USD sesuai pilihan; format util kecil di komponen.
- Tidak mengubah `client.ts`/types auto-gen; `types.ts` domain ditambah interface `FinancialModel`.

## Yang TIDAK berubah
- Logika scoring judge/AI archetype existing tetap utuh; dashboard finansial terpisah dan tidak mempengaruhi skor judge.
