# ✅ BA Survey Approval Integration - COMPLETE

## 📋 Summary
Successfully integrated BA Survey signature upload with backend API. The approval flow now properly uploads signature images to the backend with `document_type` differentiation.

---

## 🔄 Complete Flow

### User Approval Process

1. **User clicks "Approve" button**
   - Opens `BASurveyApprovalModal`
   - Shows PDF preview and signature areas

2. **User clicks signature area**
   - Opens `SignaturePadModal`
   - User draws signature

3. **User clicks "Simpan & Setujui"**
   - **Step 1:** Convert base64 signature to Blob
   - **Step 2:** Upload signature to backend
     - `POST /api/ba-surveys/{id}/upload-signature`
     - FormData: `file` + `document_type` (signature_mitra or signature_waspang)
   - **Step 3:** Save signature to localStorage (for display)
   - **Step 4:** Update approval status
     - `PATCH /api/ba-surveys/{id}/approval`
     - Body: `{ approved_by_user1: true }` or `{ approved_by_user2: true }`

4. **Success**
   - Signature uploaded to backend
   - Approval status updated
   - Modal closes

---

## 🎯 Changes Made

### Backend

#### 1. Model Updates
**File:** `src/models/project_new.rs`
```rust
pub struct Evidence {
    // ... existing fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_type: Option<String>, // NEW
}
```

**File:** `src/models/ba_survey.rs`
```rust
pub struct DocumentMetadata {
    // ... existing fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_type: Option<String>, // NEW
}
```

#### 2. Repository Update
**File:** `src/repositories/ba_survey_repo.rs`
- Updated `save_document()` to pass `document_type` to Evidence

#### 3. New Handler
**File:** `src/handlers/ba_survey_handler.rs`
- Added `upload_ba_survey_signature()` handler
- Handles multipart file upload
- Validates `document_type` (signature_mitra or signature_waspang)
- Saves to `uploads/ba_survey/signatures/`
- Creates Evidence record with `document_type`

#### 4. New Route
**File:** `src/routes/ba_survey_routes.rs`
```rust
.route("/{id}/upload-signature", web::post().to(ba_survey_handler::upload_ba_survey_signature).wrap(require_auth()))
```

### Frontend

#### 1. Service Update
**File:** `src/services/baSurveyService.ts`

Added new method:
```typescript
async uploadSignature(
  id: string,
  signatureBlob: Blob,
  documentType: 'signature_mitra' | 'signature_waspang',
  token: string | null
): Promise<{
  success: boolean;
  message: string;
  evidence_id: string;
  file_path: string;
  file_name: string;
  document_type: string;
}>
```

#### 2. Modal Update
**File:** `src/components/modals/ba-survey/BASurveyApprovalModal.tsx`

Updated `handleSaveSignature()`:
1. Convert base64 to Blob
2. Call `uploadSignature()` API
3. Save to localStorage
4. Update approval status

---

## 📡 API Endpoints

### Upload Signature
```
POST /api/ba-surveys/{id}/upload-signature
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: <signature_image.png>
- document_type: "signature_mitra" | "signature_waspang"

Response (201):
{
  "success": true,
  "message": "Signature uploaded successfully",
  "evidence_id": "evidence:xxx",
  "file_path": "uploads/ba_survey/signatures/ba_survey_sig_xxx_timestamp.png",
  "file_name": "ba_survey_sig_xxx_timestamp.png",
  "document_type": "signature_mitra"
}
```

### Update Approval
```
PATCH /api/ba-surveys/{id}/approval
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "approved_by_user1": true  // for MITRA
  // OR
  "approved_by_user2": true  // for WASPANG
}

Response (200):
{
  "success": true,
  "message": "BA Survey approval updated successfully",
  "id": "xxx",
  "approved_by_user1": true,
  "approved_by_user2": false
}
```

---

## 💾 Database Storage

### Evidence Table
```json
{
  "id": "evidence:xxx",
  "process_id": "ba_survey_{ba_survey_id}",
  "project_id": "project:xxx",
  "file_path": "uploads/ba_survey/signatures/ba_survey_sig_xxx_1716192000000.png",
  "file_name": "ba_survey_sig_xxx_1716192000000.png",
  "file_type": "image/png",
  "file_size": 12345,
  "file_category": "ba_survey",
  "keterangan": "Tanda Tangan MITRA",
  "status": "approved",
  "document_type": "signature_mitra",  // ✅ NEW
  "created_at": "2026-05-20T..."
}
```

### Query Signatures
```sql
-- Get MITRA signature
SELECT * FROM evidence 
WHERE process_id = "ba_survey_xxx" 
  AND document_type = "signature_mitra";

-- Get WASPANG signature
SELECT * FROM evidence 
WHERE process_id = "ba_survey_xxx" 
  AND document_type = "signature_waspang";

-- Get all signatures for BA Survey
SELECT * FROM evidence 
WHERE process_id = "ba_survey_xxx" 
  AND document_type IN ["signature_mitra", "signature_waspang"];
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Start Backend**
   ```bash
   cd rmj-be-v1
   cargo run
   ```

2. **Start Frontend**
   ```bash
   cd rmj-new-design
   npm run dev
   ```

3. **Test Approval Flow**
   - Navigate to Survey page
   - Click "Approve" on a BA Survey
   - Draw signature
   - Click "Simpan & Setujui"
   - Check browser console for logs
   - Verify signature uploaded to backend
   - Verify approval status updated

4. **Verify Backend**
   - Check `uploads/ba_survey/signatures/` folder
   - Query Evidence table for signature records
   - Verify `document_type` field is set correctly

### Expected Console Logs

**Frontend:**
```
🔄 Starting approval flow: { baSurveyId: "xxx", documentType: "signature_mitra" }
✅ Signature converted to Blob: 12345 bytes
📤 Uploading signature...
✅ Signature uploaded successfully: { success: true, ... }
✅ Signature saved to localStorage
📤 Updating approval status...
✅ Approval flow completed successfully
```

**Backend:**
```
📤 [UPLOAD BA SURVEY SIGNATURE] Starting...
   - BA Survey ID: xxx
   - Processing field: file
   - Original filename: signature.png
   - Saving to: uploads/ba_survey/signatures/ba_survey_sig_xxx_1716192000000.png
   ✅ File saved successfully
   - Size: 12345 bytes
   - Document type: signature_mitra
✅ [UPLOAD BA SURVEY SIGNATURE] Success
   - Evidence ID: Some(Thing { tb: "evidence", id: Id(String("xxx")) })
   - Document Type: signature_mitra
```

---

## ✅ Checklist

### Backend
- [x] Add `document_type` field to Evidence model
- [x] Add `document_type` field to DocumentMetadata model
- [x] Update `save_document()` to support `document_type`
- [x] Create `upload_ba_survey_signature()` handler
- [x] Register route `/api/ba-surveys/{id}/upload-signature`
- [x] Fix all Evidence initializations with `document_type: None`
- [x] Backend compiles successfully

### Frontend
- [x] Add `uploadSignature()` method to baSurveyService
- [x] Update `handleSaveSignature()` in BASurveyApprovalModal
- [x] Convert base64 to Blob
- [x] Call upload API before approval API
- [x] Handle errors properly
- [x] Add console logs for debugging

### Documentation
- [x] Backend API documentation
- [x] Frontend integration guide
- [x] Database schema documentation
- [x] Testing guide

---

## 🎉 Status

**✅ COMPLETE - Ready for Testing**

Both backend and frontend are fully integrated and ready for end-to-end testing.

---

## 📝 Notes

- Signatures are stored both in backend (Evidence table) and localStorage (for display)
- `document_type` field is optional in Evidence model (backward compatible)
- File naming: `ba_survey_sig_{ba_survey_id}_{timestamp}.{extension}`
- Upload directory: `uploads/ba_survey/signatures/`
- Supported document types: `signature_mitra`, `signature_waspang`

---

**Date:** 2026-05-20
**Status:** ✅ Integration Complete
