# ⚠️ BA Survey Approval Flow - CONFIRMATION REQUIRED

## 📋 SUMMARY

Saya telah menganalisis backend dan menemukan bahwa **backend BELUM mendukung upload signature dengan `document_type`** untuk membedakan tanda tangan MITRA dan WASPANG.

---

## 🔍 ANALISIS BACKEND

### ✅ Yang Sudah Ada di Backend

1. **Approval Endpoint** - `PATCH /api/ba-surveys/{id}/approval`
   - Menerima: `{ approved_by_user1: bool, approved_by_user2: bool }`
   - Berfungsi dengan baik untuk update status approval

2. **Document Upload Endpoint** - `POST /api/ba-surveys/{id}/documents`
   - Menerima: `DocumentMetadata` (file_path, file_name, file_type, file_size, keterangan, status)
   - Menyimpan ke tabel `evidence` dengan `file_category: "ba_survey"`

### ❌ Yang BELUM Ada di Backend

1. **Field `document_type`** di model `DocumentMetadata` dan `Evidence`
   - Tidak ada cara untuk membedakan jenis dokumen (signature MITRA vs WASPANG)
   - Field `file_category` hardcoded ke `"ba_survey"` untuk semua dokumen BA Survey

2. **Multipart File Upload**
   - Endpoint saat ini hanya menerima metadata (JSON)
   - Tidak ada endpoint untuk upload file signature secara langsung

---

## 🔄 FLOW COMPARISON

### Flow Saat Ini (Frontend)
```
1. User klik tombol "Approve"
2. Modal terbuka dengan PDF preview
3. User gambar tanda tangan
4. Signature disimpan ke localStorage
   - Key: ba_survey_sig_user1_{id} atau ba_survey_sig_user2_{id}
5. Hit API: PATCH /api/ba-surveys/{id}/approval
   - Body: { approved_by_user1: true } atau { approved_by_user2: true }
```

**❌ MASALAH:** Signature hanya tersimpan di localStorage (client-side), tidak di backend!

### Flow yang Diinginkan User
```
1. User klik tombol "Approve"
2. Modal terbuka dengan PDF preview
3. User gambar tanda tangan
4. Hit API 1: POST /api/ba-surveys/{id}/documents (UPLOAD SIGNATURE)
   - Body: FormData dengan signature image
   - Include: document_type: "signature_mitra" atau "signature_waspang"
5. Hit API 2: PATCH /api/ba-surveys/{id}/approval (UPDATE STATUS)
   - Body: { approved_by_user1: true } atau { approved_by_user2: true }
```

**✅ KEUNTUNGAN:** Signature tersimpan di backend, bisa diakses kapan saja

---

## 🛠️ SOLUSI YANG TERSEDIA

### OPSI 1: Backend Changes (RECOMMENDED) ⭐

**Perubahan Backend yang Diperlukan:**

1. **Update Database Schema**
   ```sql
   -- Add document_type field to evidence table
   DEFINE FIELD document_type ON evidence TYPE option<string>;
   ```

2. **Update Rust Models**
   ```rust
   // src/models/ba_survey.rs
   pub struct DocumentMetadata {
       pub file_path: String,
       pub file_name: String,
       pub file_type: String,
       pub file_size: i64,
       pub keterangan: Option<String>,
       pub status: Option<String>,
       pub document_type: Option<String>, // NEW
   }
   
   // src/models/project_new.rs
   pub struct Evidence {
       // ... existing fields
       pub document_type: Option<String>, // NEW
   }
   ```

3. **Update Repository**
   ```rust
   // src/repositories/ba_survey_repo.rs
   // Update save_document to include document_type
   ```

**Perubahan Frontend:**
```typescript
// 1. Convert signature to File/Blob
const signatureBlob = await fetch(signatureData).then(r => r.blob());
const signatureFile = new File([signatureBlob], `signature_${userType}.png`, { type: 'image/png' });

// 2. Upload file to storage (existing upload endpoint)
const uploadedPath = await uploadFile(signatureFile);

// 3. Save document metadata with document_type
await baSurveyService.saveDocument(baSurveyId, {
  file_path: uploadedPath,
  file_name: `signature_${userType}.png`,
  file_type: 'image/png',
  file_size: signatureFile.size,
  document_type: userType === 'user1' ? 'signature_mitra' : 'signature_waspang',
  keterangan: userType === 'user1' ? 'Tanda Tangan MITRA' : 'Tanda Tangan TELKOM WASPANG',
  status: 'approved'
});

// 4. Update approval status
await baSurveyService.updateApproval(baSurveyId, {
  approved_by_user1: userType === 'user1' ? true : undefined,
  approved_by_user2: userType === 'user2' ? true : undefined
});
```

**✅ KEUNTUNGAN:**
- Semantically correct
- Easy to query signatures by document_type
- Scalable for future document types
- Proper separation of concerns

**❌ KEKURANGAN:**
- Memerlukan perubahan backend
- Perlu testing backend

---

### OPSI 2: Workaround dengan `keterangan` Field (NOT RECOMMENDED)

**Cara Kerja:**
- Gunakan field `keterangan` untuk menyimpan jenis signature
- Contoh: `keterangan: "SIGNATURE_MITRA"` atau `keterangan: "SIGNATURE_WASPANG"`

**Frontend Changes:**
```typescript
await baSurveyService.saveDocument(baSurveyId, {
  file_path: uploadedPath,
  file_name: `signature_${userType}.png`,
  file_type: 'image/png',
  file_size: signatureFile.size,
  keterangan: userType === 'user1' ? 'SIGNATURE_MITRA' : 'SIGNATURE_WASPANG', // HACK
  status: 'approved'
});
```

**✅ KEUNTUNGAN:**
- Tidak perlu perubahan backend
- Bisa langsung diimplementasi

**❌ KEKURANGAN:**
- Hack, tidak semantically correct
- Field `keterangan` seharusnya untuk deskripsi, bukan tipe dokumen
- Sulit untuk query (harus parse string)
- Tidak scalable

---

### OPSI 3: Keep Current Flow (NOT RECOMMENDED)

**Cara Kerja:**
- Tetap simpan signature di localStorage saja
- Tidak upload ke backend

**✅ KEUNTUNGAN:**
- Tidak perlu perubahan apapun
- Sudah berfungsi

**❌ KEKURANGAN:**
- Signature hilang jika localStorage dihapus
- Tidak bisa diakses dari device lain
- Tidak memenuhi requirement user
- Tidak ada audit trail

---

## ❓ PERTANYAAN UNTUK USER

**Silakan pilih salah satu opsi:**

1. **OPSI 1 (RECOMMENDED):** Saya akan buat perubahan backend terlebih dahulu (tambah field `document_type`), lalu update frontend?
   - ✅ Solusi terbaik dan paling proper
   - ⏱️ Memerlukan waktu untuk backend changes

2. **OPSI 2 (WORKAROUND):** Gunakan field `keterangan` untuk menyimpan jenis signature (hack)?
   - ⚡ Cepat, tidak perlu backend changes
   - ⚠️ Tidak proper, tapi bisa berfungsi

3. **OPSI 3 (KEEP CURRENT):** Tetap simpan signature di localStorage saja?
   - ⚡ Tidak perlu perubahan apapun
   - ❌ Tidak memenuhi requirement

---

## 📝 CATATAN PENTING

- **JANGAN UBAH FRONTEND DULU** sampai user memilih opsi
- Jika pilih Opsi 1: Backend harus diubah dan di-test dulu
- Jika pilih Opsi 2: User harus explicitly approve workaround
- Jika pilih Opsi 3: User harus explicitly change requirement

---

## 📂 FILE YANG SUDAH DIBACA

### Backend Files
- ✅ `rmj-be-v1/src/handlers/ba_survey_handler.rs`
- ✅ `rmj-be-v1/src/models/ba_survey.rs`
- ✅ `rmj-be-v1/src/services/ba_survey_service.rs`
- ✅ `rmj-be-v1/src/repositories/ba_survey_repo.rs`
- ✅ `rmj-be-v1/src/models/project_new.rs` (Evidence struct)

### Frontend Files
- ✅ `rmj-new-design/src/components/modals/ba-survey/BASurveyApprovalModal.tsx`
- ✅ `rmj-new-design/src/services/baSurveyService.ts`

---

## ⏸️ STATUS: BLOCKED

**Menunggu keputusan user untuk memilih opsi yang akan digunakan.**

**Tanggal:** 2026-05-20
