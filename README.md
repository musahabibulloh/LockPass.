# LockPass — Brankas Sandi Pribadi Terenkripsi AES-256

LockPass adalah aplikasi pengelola password (*password manager*) berbasis React + Vite yang mengutamakan privasi dan performa tinggi (*local-first*). Aplikasi ini dirancang khusus untuk menyimpan, mengelola, dan menghasilkan password yang aman secara mandiri. 

Seluruh data Anda dienkripsi secara penuh di sisi klien menggunakan algoritme standar industri **AES-256** sebelum disimpan di penyimpanan lokal browser (*localStorage*). Tidak ada data yang dikirim ke server luar, sehingga Anda memegang kendali penuh atas keamanan data Anda.

---

## 🔒 Fitur Keamanan Kepercayaan Tinggi

Untuk menjamin keamanan maksimal dan mencegah data dibaca atau dirusak oleh orang lain, LockPass dilengkapi dengan fitur pertahanan berikut:

* **Sistem PIN 6-Digit Kriptografis:** Menggantikan password panjang dengan input PIN 6-digit yang ramah diakses namun dienkripsi menggunakan AES-256.
* **Tampilan Konfigurasi Awal (Setup Screen):** Pada peluncuran pertama, aplikasi mengharuskan pengguna membuat dan mengonfirmasi PIN baru mereka sendiri secara lokal. Tidak ada PIN bawaan/default yang disimpan di kode sumber.
* **Auto-Submit & Visualisasi Box PIN:** Layar kunci menggunakan kotak digit visual premium yang secara otomatis memproses masuk ketika digit ke-6 selesai dimasukkan.
* **Proteksi Brute-Force (Lockout):**
  * Salah memasukkan PIN sebanyak **3 kali** akan mengunci brankas selama **30 detik**.
  * Salah memasukkan PIN sebanyak **5 kali** akan mengunci brankas selama **5 menit**.
  * Waktu penguncian ini disimpan di penyimpanan lokal sehingga menyegarkan halaman browser (*refresh*) tidak akan membatalkan waktu tunggu.
* **Kunci Otomatis saat Tidak Aktif (*Auto-Lock on Inactivity*):**
  * Aplikasi memantau aktivitas Anda (gerakan mouse, pengetikan, klik, gulir layar).
  * Brankas akan mengunci dirinya kembali secara otomatis jika tidak ada aktivitas selama **3 menit**.
* **Otorisasi PIN untuk Tindakan Kritis:**
  * **Hapus Akun:** Mewajibkan verifikasi PIN brankas sebelum menghapus password layanan.
  * **Ekspor Cadangan:** Mewajibkan verifikasi PIN sebelum dapat mengunduh file cadangan.
  * **Reset Brankas:** Hanya dapat dilakukan dari dalam menu setelan dengan memverifikasi PIN dan mengetik kalimat konfirmasi `"HAPUS PERMANEN"`. Hal ini mencegah orang asing menghapus data Anda secara sengaja atau iseng dari luar layar kunci.

---

## 🛠️ Fitur Fungsional Utama

1. **Dashboard Brankas Terorganisir:**
   * Statistik brankas: Total Sandi, Sandi Kuat, Sandi Lemah, dan Sandi yang Dipakai Ulang.
   * Pencarian instan untuk nama layanan, username, URL, atau catatan.
   * Pembagian kategori rapi: Media Sosial, Keuangan, Pekerjaan, Personal, dan Lainnya.
2. **Pengamanan Sandi Dinamis:**
   * Tombol tampil/sembunyikan sandi dengan sekali klik.
   * Salin username & sandi langsung ke clipboard dengan toast notifikasi visual.
3. **Generator Sandi Kuat:**
   * Kustomisasi panjang karakter (8-32 digit) dan kombinasi jenis karakter (huruf besar, huruf kecil, angka, simbol).
   * Integrasi langsung untuk mengisi form pembuatan password baru dengan sekali klik.
4. **Audit Keamanan Otomatis:**
   * Memberikan skor kesehatan vault (0-100) dan daftar peringatan jika ada sandi yang dinilai lemah atau terdeteksi digunakan di beberapa akun berbeda.
5. **Cadangkan & Impor (Backup & Restore):**
   * Ekspor data terenkripsi (.json) yang tetap aman disimpan di cloud atau flashdisk karena terkunci oleh PIN Anda.
   * Impor cadangan untuk memulihkan seluruh sandi Anda di perangkat baru.

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

Pastikan Anda telah menginstal [Node.js](https://nodejs.org/) di komputer Anda.

1. **Unduh repositori dan masuk ke folder proyek:**
   ```bash
   git clone https://github.com/musahabibulloh/LockPass.git
   cd LockPass
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan lokal:**
   ```bash
   npm run dev
   ```
   Buka peramban browser Anda di alamat: **[http://localhost:5173/](http://localhost:5173/)**

4. **Kompilasi produksi (Build):**
   ```bash
   npm run build
   ```
   Hasil build siap pakai akan disimpan di folder `dist/`.

---

## 📖 Panduan Penggunaan Aplikasi

### 1. Membuka Kunci Brankas (Pertama Kali)
* Saat pertama kali membuka website, Anda akan langsung disajikan halaman **Buat PIN LockPass Baru**.
* Silakan buat 6-digit PIN angka pilihan Anda dan masukkan kembali di kolom konfirmasi, kemudian klik tombol untuk menyimpan.
* PIN ini akan langsung digunakan secara lokal sebagai kunci utama dekripsi brankas sandi Anda.

### 2. Menyimpan Sandi Baru
* Klik tombol **Tambah Akun** di pojok kanan atas brankas.
* Isi kolom **Nama Layanan**, **URL**, dan **Username**.
* Masukkan **Password** Anda, atau klik tombol **Generate** untuk meminta sistem membuatkan sandi acak yang sangat kuat secara instan.
* Pilih **Kategori** layanan dan isi **Catatan** tambahan jika diperlukan, lalu klik **Simpan Akun**.

### 3. Mengubah PIN Aktif / Mengosongkan Brankas
* Buka menu **Cadangkan & Impor** di menu sebelah kiri.
* Klik tombol **Sapu Bersih Semua Data Vault** di bagian Zona Bahaya bawah.
* Masukkan PIN aktif saat ini, lalu ketik **`HAPUS PERMANEN`** untuk menyetel ulang brankas.
* Halaman akan dialihkan kembali ke layar pembuatan PIN Baru.
