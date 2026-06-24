## Fitur: Valuation per startup

Menambahkan kolom **Valuation** di setiap startup yang diisi manual oleh super admin, hanya bisa diubah super admin, dan tampil "-" jika belum diisi.

### Perilaku
- Setiap startup punya field valuation berupa teks bebas (mis. `$5M pre-money`, `Rp 20M`, `Seed — $1.2M`), supaya fleksibel.
- Tampil ke semua orang (judge + admin) di halaman detail startup.
- Belum diisi → tampil `-`.
- Sudah diisi → tampil nilainya.
- Hanya admin yang melihat tombol/aksi untuk mengedit valuation.

### Tampilan
- Di header detail startup (dekat metadata seperti sector/archetype) muncul baris label `VALUATION` dengan nilainya, memakai gaya `mono-num` agar konsisten dengan angka lain.
- Untuk admin: ada tombol kecil "Edit" di samping valuation yang membuka dialog input, lalu disimpan.

```text
AIGN  ▸  Startup Name   [Open] [AI done]
one-liner ...
[archetype] [sector] [confidence]
VALUATION  $5M pre-money   (Edit)   ← admin lihat tombol Edit
```

### Teknis

**1. Database (migration)**
- Tambah kolom `valuation text` (nullable) ke tabel `public.startups`.
- Tidak perlu kebijakan RLS baru karena penulisan dilakukan lewat server function yang sudah memeriksa `isAdmin` (service via RLS user). Update tetap mengikuti policy `startups` yang ada untuk admin.

**2. Types**
- `src/integrations/supabase/types.ts` akan ter-regenerate otomatis setelah migration.
- Tambah `valuation: string | null` ke interface `Startup` di `src/lib/curation/types.ts` dan map `valuation: row.valuation` di `mapStartup` (`curation.functions.ts`).

**3. Server function**
- Tambah `setStartupValuation` di `src/lib/curation/curation.functions.ts`:
  - `createServerFn({ method: "POST" })` + `.middleware([requireSupabaseAuth])`.
  - Input: `{ id: uuid, valuation: string (trim, max ~120, boleh kosong) }`.
  - Cek `isAdmin(context)` → kalau bukan admin, `throw "Forbidden: admin only"`.
  - Update kolom `valuation` (kosong disimpan sebagai `null`).
  - Return `{ ok: true }`.

**4. UI — `src/routes/_authenticated/startups.$id.tsx`**
- Tampilkan valuation di area metadata header untuk semua user: `startup.valuation ?? "-"`.
- Untuk admin: tombol "Edit valuation" membuka dialog (pakai komponen dialog yang ada) berisi input teks; saat simpan panggil `setStartupValuation` lalu `refresh()` dan toast sukses/error.

### Catatan
- Tidak mengubah logika scoring atau AI.
- Tidak menambah field ini ke form "New startup" kecuali diminta — fokus edit di halaman detail sesuai permintaan ("di dalam setiap startup"). Bisa ditambahkan ke form New nanti kalau perlu.