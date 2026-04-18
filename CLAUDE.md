# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**介護単語練習 (Kaigo Tango Renshuu)** — aplikasi web belajar kosakata bahasa Jepang bidang perawatan (介護/kaigo) untuk jisshuusei (技能実習生) yang baru masuk. Dibuat oleh Eka Sensei.

Tujuan: membantu jisshuusei menghafal kosakata kaigo dengan cepat menggunakan metode SRS (Spaced Repetition System), dikemas dengan UI bergaya retro game agar tidak membosankan.

---

## Assets yang Tersedia

| File | Keterangan |
|---|---|
| `UBAPoDAJ5D.jpg` | Gambar header — "介護単語練習 by Eka Sensei" (gaya retro/pixel art) |
| `robloxeur-pixel-245147.mp3` | Audio efek suara retro pixel untuk tombol/interaksi |
| `kenkyu-H29_kaigono_nihongo_multi_1117.pdf` | Sumber kosakata kaigo resmi — ekstrak semua kosakata dari PDF ini |

---

## Tech Stack

- **Vanilla HTML + CSS + JavaScript** (tidak perlu framework — app harus bisa dibuka langsung di browser tanpa build step)
- **LocalStorage** untuk menyimpan data SRS per pengguna (tidak butuh backend)
- **Keputusan arsitektur:** Untuk saat ini progres tersimpan di device masing-masing jisshuusei — setiap orang lihat progres diri sendiri. Rencana ke depan: migrasi ke **Supabase** agar progres tersinkron lintas device dan sensei bisa memantau semua murid.
- **Tidak ada dependency eksternal** — semua inline atau CDN-free agar bisa dipakai offline
- Font: **Press Start 2P** (Google Fonts) untuk nuansa retro pixel
- Tidak perlu server — cukup buka `index.html` di browser

---

## Struktur File

```
/
├── index.html          # Halaman utama (Home + Dashboard)
├── study.html          # Meja belajar (pilih kategori)
├── flashcard.html      # Sesi belajar flip card + SRS
├── style.css           # Global styles (retro game theme)
├── app.js              # Logic utama: SRS, navigasi, state
├── data/
│   └── vocabulary.js   # Semua kosakata dalam format JS object
├── UBAPoDAJ5D.jpg      # Header image
└── robloxeur-pixel-245147.mp3  # SFX tombol
```

---

## Data Kosakata

Semua kosakata **harus diekstrak dari PDF** `kenkyu-H29_kaigono_nihongo_multi_1117.pdf` dan disimpan di `data/vocabulary.js`.

### Format data per kosakata:

```js
{
  id: "001",
  kanji: "入浴",
  yomkata: "にゅうよく",
  arti: "mandi (berendam)",
  contoh: "毎日入浴することが大切です。",
  contoh_arti: "Mandi setiap hari itu penting.",
  kategori: "kebersihan_diri"
}
```

### Kategori kosakata (perkategori, tanpa emoji):

- `kebersihan_diri` — mandi, gosok gigi, cuci tangan, dll
- `makan_minum` — makan, minum, makanan, alat makan
- `BAB_BAK` — toilet, popok, pembuangan
- `mobilisasi` — berdiri, duduk, berjalan, kursi roda
- `kondisi_tubuh` — sakit, nyeri, demam, tekanan darah
- `obat_perawatan` — obat, infus, luka, balut
- `komunikasi` — salam, permintaan, kata sopan
- `fasilitas` — ruangan, alat, gedung
- `kedaruratan` — darurat, jatuh, tidak sadarkan diri

---

## Fitur & Logika

### 1. Home Page

- Tampilkan **header image** (`UBAPoDAJ5D.jpg`) dengan **animasi bounce/naik-turun** (CSS keyframe)
- Dashboard perkembangan belajar:
  - Total kosakata dipelajari / total kosakata
  - Streak harian (hari berturut-turut belajar)
  - Kartu yang jatuh tempo hari ini (due today)
- Tombol mulai dalam bahasa Jepang: **「勉強する」** — ketika diklik putar SFX + navigasi ke `study.html`
- Desain: pixel art border, warna retro (lihat Palet Warna)

### 2. Meja Belajar (study.html)

- Tampilkan daftar kategori kosakata (tanpa emoji, nama kategori dalam bahasa Indonesia)
- Setiap kategori tampilkan progress bar (berapa sudah dipelajari)
- Ketika memilih kategori → putar SFX + masuk ke sesi flashcard
- Feeling navigasi seperti menu game retro: highlight item aktif, border berkedip

### 3. Flashcard (flashcard.html)

**Sisi Depan kartu:**
- Tampilkan **kanji** besar di tengah
- Tombol kecil di bawah kanji: `よみかた` — ketika diketuk, hiragana **muncul perlahan** (fade in), **tanpa suara (ONSEI)**
- Tombol **FLIP** untuk membalik kartu → putar SFX

**Sisi Belakang kartu:**
- **Arti** dalam bahasa Indonesia (besar, jelas)
- **Contoh kalimat** di bagian bawah kartu (kanji + terjemahan Indonesia)
- Tombol kembali untuk flip balik ke depan

**Tombol SRS (muncul di sisi belakang):**

| Tombol | Label Jepang | Interval Berikutnya |
|---|---|---|
| Sangat Mudah | とても簡単 | interval × 3 (min 7 hari) |
| Ingat | 覚えた | interval × 2.5 |
| Agak Lupa | 少し忘れた | interval × 1.2 (min 1 hari) |
| Susah | 難しい | reset ke 10 menit (review segera) |

Setiap tombol diklik → putar SFX retro.

### 4. Algoritma SRS

Implementasi sederhana berbasis **SM-2 (SuperMemo 2)** yang disimpan di LocalStorage:

```js
// Struktur data per kartu di localStorage
{
  id: "001",
  interval: 1,        // hari sampai review berikutnya
  easeFactor: 2.5,    // faktor kemudahan (2.5 default)
  dueDate: "2026-04-18", // kapan kartu ini muncul lagi
  reviewCount: 0,     // berapa kali sudah direview
  lapses: 0           // berapa kali lupa total
}
```

Fungsi inti:
- `scheduleCard(card, rating)` — hitung dueDate baru berdasarkan rating
- `getDueCards(kategori)` — ambil kartu yang sudah jatuh tempo hari ini
- `getNewCards(kategori, limit)` — ambil kartu baru (belum pernah dipelajari)
- `saveProgress(card)` — simpan ke localStorage

Urutan sesi belajar: **due cards** dulu, kemudian **new cards** (max 10 baru per sesi).

### 5. Dashboard

- **Pie chart / progress bar** sederhana (pure CSS, tanpa library chart)
- Tampilkan per kategori: berapa kartu New / Learning / Mastered
- Mastered = kartu dengan interval > 21 hari
- Streak: simpan `lastStudyDate` di localStorage, hitung hari berturut-turut

---

## UI / Desain

### Palet Warna Retro Game

```css
--bg-dark:       #1a1a2e;   /* latar belakang utama */
--bg-panel:      #16213e;   /* panel / kartu */
--accent-yellow: #f5a623;   /* highlight, border aktif */
--accent-cyan:   #00d4ff;   /* teks utama terang */
--accent-green:  #39ff14;   /* tombol "ingat" / sukses */
--accent-red:    #ff3131;   /* tombol "lupa" / danger */
--accent-purple: #9b59b6;   /* aksen dekorasi */
--text-white:    #e8e8e8;
```

### Font

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
font-family: 'Press Start 2P', cursive;
```

Ukuran font kecil karena font ini compact: body 8-10px, heading 14-16px, kanji flashcard 32-40px (gunakan font system untuk kanji agar terbaca).

### Animasi

- Header bounce: `@keyframes bounce` naik turun terus menerus (infinite)
- Kartu flip: CSS `transform: rotateY(180deg)` dengan `perspective: 1000px`
- Tombol hover: `transform: scale(1.05)` + border glow effect
- Menu kategori: item aktif/hover border `--accent-yellow` berkedip (blink keyframe)

### Audio

```js
const sfx = new Audio('robloxeur-pixel-245147.mp3');
// Putar setiap kali tombol diklik
function playClick() {
  sfx.currentTime = 0;
  sfx.play();
}
```

Pasang event listener `playClick()` pada **semua tombol interaktif** — tombol kategori, flip, SRS rating, dan navigasi.

---

## Validasi Kosakata

Sebelum build final:
- Verifikasi semua `yomkata` adalah **hiragana murni** (bukan romaji, bukan katakana kecuali loanword)
- Verifikasi semua `kanji` bisa dibaca dengan `yomkata` yang diberikan
- Verifikasi `contoh` kalimat menggunakan kosakata yang bersangkutan
- Tidak boleh ada kosakata duplikat (cek berdasarkan `kanji`)

---

## Mobile First

- Semua layout menggunakan **flexbox/grid**, lebar max `480px` di desktop (center)
- Touch target minimal `48×48px` untuk semua tombol
- Tidak ada hover-only state — semua interaksi harus bisa dengan tap
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1">`

---

## Cara Menjalankan

```bash
# Tidak butuh build step — langsung buka di browser:
open index.html

# Atau pakai live server lokal:
npx serve .
# atau
python -m http.server 8080
```

---

## Urutan Implementasi yang Disarankan

1. Ekstrak dan susun semua kosakata dari PDF → `data/vocabulary.js`
2. Buat `style.css` dengan tema retro (warna, font, animasi dasar)
3. Buat `index.html` (home + dashboard kosong)
4. Buat `study.html` (daftar kategori)
5. Buat `flashcard.html` + logic flip card
6. Implementasi SRS di `app.js`
7. Sambungkan dashboard dengan data SRS
8. Test semua kosakata — pastikan tidak ada typo kanji/hiragana
