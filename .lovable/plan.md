# AIGN Curation v2 — Judge-Based Scoring

Mengubah aplikasi dari "wizard penilai tunggal" menjadi platform penjurian: Admin memasukkan startup, AI menilai duluan sebagai referensi, lalu juri login untuk memberi skor 1–10 + justifikasi. Skor final = rata-rata semua juri.

## Konsep alur

```text
ADMIN                         AI (otomatis)              JURI
─────                         ────────────               ────
Input startup:                Klasifikasi archetype      Login → lihat daftar startup
 • paste deskripsi            Skor 1–10 / kategori   →   Buka startup → baca skor + analisis AI
 • upload PPT/PDF (opsional)  Ringkasan + analisis       Beri skor 1–10 / kategori + justifikasi
 • upload transkrip (ops.)    Rekomendasi awal           Submit
        │                            │                          │
        └──────────────► startup tersimpan ◄──── rata-rata skor juri = SKOR FINAL
```

## Hal yang berubah dari versi sekarang
- **Skala 1–5 → 1–10** di seluruh rubrik & tampilan.
- **Wizard manual dihapus** sebagai alur utama. Penilaian manual kini milik juri (form ringkas, bukan stepper 5 langkah).
- **localStorage diganti Lovable Cloud** (database + auth + storage + AI). Perlu mengaktifkan Lovable Cloud.
- 9 kategori rubrik + 7 archetype tetap dipakai (logika di `src/lib/curation/` dipertahankan, hanya skala & sumber data yang berubah).

## Peran & akun
- **Admin**: input/kelola startup, undang juri, lihat rekap semua skor.
- **Juri**: lihat startup + skor AI, beri penilaian 1–10 + justifikasi pada startup yang ditugaskan.
- Role disimpan di tabel `user_roles` terpisah (bukan di profil) dengan fungsi `has_role` (security definer). Admin pertama di-seed.
- Auth: Email/Password + Google sign-in.

## Database (Lovable Cloud)
- `profiles` — id (→ auth.users), nama, email; auto-create via trigger saat signup.
- `user_roles` — user_id, role (`admin` | `judge`); enum `app_role`; `has_role()`.
- `startups` — id, name, one_liner, description (teks gabungan), archetype, status (`draft`/`open`/`closed`), deck_path, transcript_path, `ai_scores` (jsonb: kategori→1–10), `ai_archetype_confidence`, `ai_summary`, `ai_strengths`, `ai_weaknesses`, `ai_risks`, `ai_recommendation`, created_by, timestamps.
- `judge_scores` — id, startup_id, judge_id, `scores` (jsonb: kategori→1–10), `justification` (teks per startup), submitted_at; unik (startup_id, judge_id).
- Semua tabel: GRANT eksplisit + RLS. Juri hanya baca startup berstatus open & tulis skor miliknya; admin akses penuh via `has_role`.
- Storage bucket privat `startup-files` untuk PPT/PDF/transkrip, dengan RLS.

## Input file & ekstraksi teks
- **Paste teks**: selalu didukung (jalur utama, paling andal).
- **PDF**: dikirim ke AI Gateway sebagai file (base64) — Gemini membaca PDF langsung.
- **PPTX**: di-unzip di server function (baca XML slide) untuk ambil teks.
- **Transkrip**: file teks/`.txt`/`.md` dibaca langsung; PDF/PPT lewat jalur di atas.
- File disimpan ke Storage; teks hasil ekstraksi digabung ke `description` untuk dinilai AI.

## Penilaian AI
- Server function (`createServerFn`) memanggil **Lovable AI Gateway** (`google/gemini-2.5-flash`) dengan rubrik 9 kategori sebagai konteks.
- Output terstruktur (JSON): archetype + confidence, skor 1–10 tiap kategori, ringkasan, kekuatan, kelemahan, risiko, rekomendasi.
- Dijalankan saat admin menyimpan startup (status jadi `open` setelah AI selesai). Bisa "Nilai ulang dengan AI".

## Skor final
- = **rata-rata skor juri** per kategori, lalu dibobot rubrik jadi skor 0–100 (memakai bobot kategori yang sudah ada).
- Skor AI tampil berdampingan sebagai pembanding, tidak masuk total.

## Halaman / rute
- `/` — landing publik (hero "Curate AI startups with clarity", CTA → login/Start Evaluation). Tetap.
- `/auth` — login & signup (email/password + Google).
- `/_authenticated/dashboard` — daftar startup; admin lihat semua + status, juri lihat yang open + status "sudah dinilai/belum".
- `/_authenticated/startups/$id` — detail startup: ringkasan + skor & analisis AI (read-only) di kiri, panel penilaian juri (slider/angka 1–10 per kategori + justifikasi) di kanan. Admin melihat rekap rata-rata semua juri di sini.
- `/_authenticated/admin/new` & `/admin/startups/$id/edit` — form input startup (paste + upload).
- `/_authenticated/admin/judges` — kelola/undang juri, atur role (khusus admin).
- Rute admin digate dengan cek `has_role('admin')`.

## Komponen UI (memakai gaya AIGN yang ada)
- Reuse `ScoreBar`, `StatCard`, `ArchetypeBadge`, `RecommendationBadge`, radar chart.
- Komponen baru: `JudgeScoreForm` (1–10 per kategori + justifikasi), `AiVsJudgePanel` (bandingkan AI vs rata-rata juri), `StartupInputForm` (paste + dropzone file), `JudgeStatusBadge`.
- Pertahankan tipografi & token warna AIGN (Plus Jakarta Sans + JetBrains Mono, palet di `src/styles.css`).

## Detail teknis
- Auth: layout `_authenticated` (integration-managed, `ssr:false`), `requireSupabaseAuth` di server fn, `attachSupabaseAuth` di `src/start.ts`. Loader rute terproteksi hanya di bawah `_authenticated`.
- Server fn: `createStartupWithAi`, `runAiEvaluation`, `submitJudgeScore`, `listStartups`, `getStartupDetail`, `inviteJudge` (admin-only, verifikasi role di handler).
- Google OAuth lewat broker `lovable.auth.signInWithOAuth` + `configure_social_auth`.
- Update `src/lib/curation/rubric.ts` & `scoring.ts` ke skala 1–10 (anchor, legend, perhitungan persen `/10`, ambang rekomendasi tetap 0–100).
- Tipe baru di `types.ts`: `ScoreValue` jadi 1–10, tambah tipe `Startup`, `JudgeScore`.

## Yang TIDAK berubah
- Identitas brand AIGN, palet, font, footer "AIGN · AI Startup Ecosystem Framework".
- Logika archetype & bobot kategori (hanya skala & sumber data berubah).

Setelah disetujui, saya mulai dengan mengaktifkan Lovable Cloud, membuat skema database + auth, lalu membangun alur input → AI → penjurian.