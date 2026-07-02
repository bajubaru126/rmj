# User Guide - RMJ Application

## Daftar Isi
1. [Dashboard](#1-dashboard)
2. [Dashboard Map](#2-dashboard-map)
3. [Project](#3-project)
   - [Sub Menu KML](#sub-menu-kml)
   - [Sub Menu Document](#sub-menu-document)
   - [Sub Menu KOM](#sub-menu-kom)
   - [Sub Menu SS Link](#sub-menu-ss-link)
4. [Survey](#4-survey)
   - [Sub Menu Data Survey](#sub-menu-data-survey)
   - [Sub Menu Span](#sub-menu-span)
   - [Sub Menu KML](#sub-menu-kml-1)
   - [Sub Menu Redline](#sub-menu-redline)
   - [Sub Menu Drawing](#sub-menu-drawing)
   - [Sub Menu BA Survey](#sub-menu-ba-survey)
5. [DRM (Design Review Meeting)](#5-drm-design-review-meeting)
6. [Configuration - User Management](#6-configuration---user-management)

---

## 1. Dashboard

Dashboard adalah halaman utama yang menampilkan ringkasan operasional proyek secara real-time.

![Menu Dashboard](Dashboard/Menu%20Dashboard.png)

### Fitur Utama:
- **Summary Metrics**: Menampilkan statistik proyek seperti:
  - Total Projects
  - Active Projects
  - Survey Completion (%)
  - DRM Pending
  - Installation Progress (%)
  - Active Risks

- **Operational Progress**: Grafik progress untuk:
  - Survey
  - DRM
  - Installation

- **Risk Monitor**: Panel monitoring risiko dengan kategori:
  - Survey Risks
  - DRM Risks
  - Installation Risks

### Cara Menggunakan:
1. Buka aplikasi dan Anda akan langsung masuk ke halaman Dashboard
2. Lihat ringkasan proyek di bagian atas
3. Monitor progress operasional di bagian tengah
4. Periksa risiko aktif di panel Risk Monitor

---

## 2. Dashboard Map

Dashboard Map menampilkan visualisasi GIS (Geographic Information System) dari semua proyek dalam bentuk peta interaktif.

![Menu Dashboard Map](Dashboard%20Map/Menu%20Dashboard%20Map.png)

### Fitur Utama:
- **Interactive Map**: Peta interaktif dengan marker proyek
- **Project Filtering**: Filter proyek berdasarkan:
  - Type
  - Status
  - Search Query
- **Time Slider**: Slider waktu untuk melihat proyek berdasarkan periode
- **Map Type Selector**: Pilihan jenis peta:
  - Satellite
  - Streets
  - Hybrid
  - Terrain
- **Legend**: Legenda untuk:
  - Designator (jenis kabel)
  - Status Proyek
- **Ukuran Tampilan**: Kontrol ukuran elemen peta

### Cara Menggunakan:
1. Klik menu "Dashboard Map" di sidebar
2. Gunakan sidebar kiri untuk filter dan pencarian proyek
3. Klik marker proyek di peta untuk melihat detail
4. Gunakan Time Slider di bagian bawah untuk filter berdasarkan waktu
5. Sesuaikan jenis peta dan ukuran tampilan sesuai kebutuhan

---

## 3. Project

Menu Project mengelola semua data proyek dan link survey.

![Menu Project](Project/Menu%20Project.png)

### Fitur Utama:
- **Project List**: Daftar semua proyek dengan informasi:
  - Project Name
  - Region
  - Start Date & End Date
  - Status
  - Links Count
- **Create Project**: Tombol untuk membuat proyek baru
- **Search & Filter**: Pencarian dan filter proyek
- **Export/Import**: Ekspor dan impor data proyek

![Create Project](Project/Create%20Project.png)

### Cara Membuat Project Baru:
1. Klik tombol "Tambah Project" di pojok kanan atas
2. Isi form dengan data:
   - Project Name
   - Region
   - Start Date
   - End Date
   - Description
3. Klik "Save" untuk menyimpan

---

### Sub Menu KML

Sub menu untuk mengelola file KML (Keyhole Markup Language) proyek.

![Sub Menu KML](Project/Project%20List%20&%20Sub%20Menu%20KML.png)

### Fitur:
- **Upload KML**: Upload file KML proyek
- **View KML**: Lihat dan preview file KML
- **Download KML**: Download file KML yang sudah diupload
- **Delete KML**: Hapus file KML

### Cara Menggunakan:
1. Klik proyek dari daftar untuk membuka detail
2. Pilih tab "KML"
3. Klik "Upload KML" untuk mengunggah file
4. File KML akan ditampilkan dalam daftar
5. Gunakan tombol aksi untuk view, download, atau delete

---

### Sub Menu Document

Sub menu untuk mengelola dokumen-dokumen proyek.

![Sub Menu Document](Project/Project%20List%20&%20Sub%20Menu%20Document.png)

### Fitur:
- **Upload Document**: Upload berbagai jenis dokumen
- **Document Categories**: Kategori dokumen seperti:
  - Technical Documents
  - Contract Documents
  - Reports
  - Others
- **Document Management**: View, download, dan delete dokumen

### Cara Menggunakan:
1. Buka detail proyek
2. Pilih tab "Document"
3. Klik "Upload Document"
4. Pilih kategori dokumen
5. Upload file dokumen
6. Kelola dokumen dengan tombol aksi yang tersedia

---

### Sub Menu KOM

Sub menu untuk mengelola KOM (Kick-Off Meeting) proyek.

![Sub Menu KOM](Project/Project%20List%20&%20Sub%20Menu%20KOM.png)

### Fitur:
- **Create KOM**: Buat data KOM baru
- **KOM Details**: Informasi KOM meliputi:
  - Meeting Date
  - Location
  - Participants
  - Minutes of Meeting (MOM)
  - Attachments
- **Edit/Delete KOM**: Edit atau hapus data KOM

![Create KOM](Project/Create%20KOM%20in%20Sub%20Menu%20KOM.png)

### Cara Membuat KOM:
1. Buka detail proyek
2. Pilih tab "KOM"
3. Klik "Tambah KOM"
4. Isi form:
   - Meeting Date
   - Location
   - Participants
   - Upload MOM file
   - Upload attachments (optional)
5. Klik "Save"

---

### Sub Menu SS Link

Sub menu untuk mengelola SS (Survey Site) Link proyek.

![Sub Menu SS Link](Project/Project%20List%20&%20Sub%20Menu%20SS%20Link.png)

### Fitur:
- **Link List**: Daftar semua link survey dalam proyek
- **Link Details**: Informasi setiap link:
  - Link Name
  - Status
  - Survey Progress
  - Contract Value
- **Create Link**: Tambah link baru
- **Edit/Delete Link**: Edit atau hapus link

### Cara Menggunakan:
1. Buka detail proyek
2. Pilih tab "SS Link"
3. Lihat daftar link yang tersedia
4. Klik "Tambah Link" untuk membuat link baru
5. Klik link untuk melihat detail survey

---

## 4. Survey

Menu Survey mengelola data survey untuk setiap link proyek.

![Menu Survey Links](Survey/Menu%20Survey%20Links.png)

### Fitur Utama:
- **Survey Links List**: Daftar semua link survey dengan informasi:
  - Link Name
  - Project Name
  - Region
  - Status
  - Survey Status
  - Contract Value
- **Search & Filter**: Pencarian dan filter link survey
- **Detail View**: Klik link untuk melihat detail survey

---

### Sub Menu Data Survey

Sub menu untuk mengelola data survey point.

![Sub Menu Data Survey](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20Data%20Survey.png)

### Fitur:
- **Survey Points List**: Daftar titik survey
- **Add Survey Point**: Tambah titik survey baru
- **Photo Upload**: Upload foto survey dengan metadata GPS
- **Designator Type**: Pilih jenis designator (Pole, ODP, Slack, Closure)
- **GPS Metadata**: Koordinat GPS otomatis dari foto

![Add Survey](Survey/Add%20Suvey%20in%20Sub%20Menu%20Data%20Survey.png)

### Cara Menambah Data Survey:
1. Buka detail survey link
2. Pilih tab "Data Survey"
3. Klik "Tambah Survey"
4. Pilih metode input:
   - **Upload Photo**: Upload foto survey (GPS metadata otomatis)
   - **Manual Entry**: Input data manual
5. Isi form:
   - Designator Type
   - GPS Coordinates (otomatis dari foto atau manual)
   - Soil Type
   - Depth
   - Description
6. Klik "Confirm & Save"

---

### Sub Menu Span

Sub menu untuk mengelola data span (ruas kabel).

![Sub Menu Span](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20Span.png)

### Fitur:
- **Span List**: Daftar span dengan informasi:
  - Span ID
  - From Point - To Point
  - Distance
  - Cable Type
  - Status
- **Add Span**: Tambah span baru
- **Map Picker**: Pilih titik awal dan akhir span dari peta
- **Span Details**: Detail lengkap setiap span

![Add Span](Survey/Add%20Span%20in%20Sub%20Menu%20Span.png)

### Cara Menambah Span:
1. Pilih tab "Span"
2. Klik "Tambah Span"
3. Pilih titik awal (From Point) dari peta atau dropdown
4. Pilih titik akhir (To Point) dari peta atau dropdown
5. Isi data span:
   - Cable Type
   - Distance (otomatis dihitung)
   - Remarks
6. Klik "Save"

---

### Sub Menu KML

Sub menu untuk mengelola file KML survey.

![Sub Menu KML](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20KML.png)

### Fitur:
- **Upload KML Survey**: Upload file KML hasil survey
- **KML Categories**:
  - KML Project (dari project)
  - KML Survey (hasil survey)
  - KML Span (data span)
- **View on Map**: Lihat KML di peta
- **Download KML**: Download file KML

### Cara Menggunakan:
1. Pilih tab "KML"
2. Klik "Upload KML"
3. Pilih kategori KML
4. Upload file KML
5. File akan muncul di daftar sesuai kategori
6. Klik "View" untuk melihat di peta

---

### Sub Menu Redline

Sub menu untuk mengelola data redline (perubahan rute).

![Sub Menu Redline](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20RedLine.png)

### Fitur:
- **Redline Nodes**: Daftar node redline
- **Node Details**: Informasi setiap node:
  - Node ID
  - Coordinates
  - Type
  - Status
- **Add Redline**: Tambah node redline baru
- **Edit/Delete**: Edit atau hapus node

### Cara Menggunakan:
1. Pilih tab "Redline"
2. Lihat daftar node redline yang ada
3. Klik "Tambah Redline" untuk menambah node baru
4. Pilih lokasi di peta atau input koordinat manual
5. Isi detail node dan save

---

### Sub Menu Drawing

Sub menu untuk mengelola gambar teknis survey.

![Sub Menu Drawing](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20Drawing.png)

### Fitur:
- **Upload Drawing**: Upload file gambar teknis
- **Drawing Types**: Jenis gambar:
  - Sketch
  - Technical Drawing
  - As-Built Drawing
- **View Drawing**: Preview gambar
- **Download Drawing**: Download file gambar

### Cara Menggunakan:
1. Pilih tab "Drawing"
2. Klik "Upload Drawing"
3. Pilih jenis gambar
4. Upload file (PDF, PNG, JPG, DWG)
5. Tambahkan keterangan
6. Klik "Save"

---

### Sub Menu BA Survey

Sub menu untuk mengelola BA (Berita Acara) Survey.

![Sub Menu BA Survey](Survey/Detail%20Survey%20Links%20&%20Sub%20Menu%20BA%20Survey.png)

### Fitur:
- **BA Survey List**: Daftar BA Survey
- **BA Details**: Informasi BA:
  - BA Number
  - BA Date
  - Participants
  - Status
  - Attachments
- **Create BA**: Buat BA Survey baru
- **Edit/Delete BA**: Edit atau hapus BA

![Add BA Survey](Survey/Add%20BA%20Survey%20in%20Sub%20BA%20Survey.png)

### Cara Membuat BA Survey:
1. Pilih tab "BA Survey"
2. Klik "Tambah BA Survey"
3. Isi form:
   - BA Number
   - BA Date
   - Participants
   - Upload BA Document
   - Upload Evidence Photos
   - Remarks
4. Klik "Save"

---

## 5. DRM (Design Review Meeting)

Menu DRM mengelola data Design Review Meeting untuk agreement BOQ antara Vendor dan TelkomInfra.

![Menu DRM](DRM/Menu%20DRM.png)

### Fitur Utama:
- **DRM List**: Daftar semua DRM dengan informasi:
  - Project Name
  - DRM Start Date
  - DRM End Date
  - Documents Count (MOM, BOQ, Redline, Matrix, Other)
  - Created At
- **Create DRM**: Tambah DRM baru
- **Edit/Delete DRM**: Edit atau hapus DRM
- **Export/Import**: Ekspor dan impor data DRM

![Create DRM](DRM/Create%20DRM.png)

### Cara Membuat DRM:
1. Klik menu "DRM" di sidebar
2. Klik tombol "Tambah DRM"
3. Isi form:
   - Pilih Project
   - DRM Start Date
   - DRM End Date
   - Upload Documents:
     - Minutes of Meeting (MOM)
     - BOQ Final Documents
     - Redline Final Documents
     - Matrix Final Documents
     - Other Documents (optional)
4. Klik "Save"

### Cara Edit DRM:
1. Klik icon "Edit" pada baris DRM yang ingin diedit
2. Update data yang diperlukan
3. Upload dokumen baru jika ada perubahan
4. Klik "Save"

### Cara Delete DRM:
1. Klik icon "Delete" pada baris DRM
2. Konfirmasi penghapusan
3. DRM akan dihapus dari sistem

---

## 6. Configuration - User Management

Menu Configuration untuk mengelola user dan hak akses sistem.

![Menu Configuration - User Management](Configuration/Menu%20Configuration%20in%20Sub%20Menu%20User%20Management.png)

### Fitur Utama:
- **User List**: Daftar semua user dengan informasi:
  - Username
  - Email
  - Role
  - Status
  - Last Login
- **Create User**: Tambah user baru
- **Edit User**: Edit data user
- **Delete User**: Hapus user
- **Role Management**: Kelola role dan permission

### Cara Menambah User:
1. Klik menu "Configuration" di sidebar
2. Pilih "User Management"
3. Klik "Tambah User"
4. Isi form:
   - Username
   - Email
   - Password
   - Role (Admin, Manager, User, Viewer)
   - Status (Active/Inactive)
5. Klik "Save"

### Cara Edit User:
1. Klik icon "Edit" pada baris user
2. Update data yang diperlukan
3. Klik "Save"

### Cara Delete User:
1. Klik icon "Delete" pada baris user
2. Konfirmasi penghapusan
3. User akan dihapus dari sistem

---

## Tips Penggunaan

### General Tips:
1. **Search Function**: Gunakan search bar untuk mencari data dengan cepat
2. **Filter**: Manfaatkan filter untuk menyaring data sesuai kebutuhan
3. **Export**: Export data ke Excel untuk analisis lebih lanjut
4. **Backup**: Lakukan backup data secara berkala

### Best Practices:
1. **Data Entry**: Pastikan data yang diinput lengkap dan akurat
2. **File Upload**: Gunakan format file yang sesuai (KML, PDF, Excel, dll)
3. **Photo Survey**: Upload foto dengan GPS metadata untuk akurasi lokasi
4. **Documentation**: Lengkapi semua dokumen yang diperlukan (KOM, BA, DRM)
5. **User Management**: Berikan role yang sesuai untuk setiap user

---

## Troubleshooting

### Masalah Umum:

**1. Tidak bisa upload file**
- Periksa ukuran file (max 10MB)
- Pastikan format file sesuai
- Periksa koneksi internet

**2. Data tidak muncul**
- Refresh halaman (F5)
- Clear browser cache
- Periksa filter yang aktif

**3. GPS tidak akurat**
- Pastikan foto memiliki GPS metadata
- Gunakan manual entry jika GPS tidak tersedia
- Verifikasi koordinat di peta

**4. Error saat save data**
- Periksa semua field required sudah diisi
- Pastikan format data sesuai
- Hubungi admin jika masalah berlanjut

---

## Kontak Support

Jika mengalami kendala atau membutuhkan bantuan lebih lanjut, silakan hubungi:

- **Email**: support@rmj.com
- **Phone**: +62 xxx xxxx xxxx
- **Help Desk**: Available 24/7

---

**Versi**: 1.0  
**Terakhir Diupdate**: 2024  
**Status**: ✅ Complete for implemented features
