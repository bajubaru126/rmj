# BA Survey Approval - Signature Upload Analysis

## CRITICAL FINDING: Backend Does NOT Support Signature Upload with document_type

### Current Backend Implementation

#### 1. Document Upload Endpoint
**Endpoint:** `POST /api/ba-surveys/{id}/documents`

**Handler:** `save_ba_survey_document` in `ba_survey_handler.rs`
```rust
pub async fn save_ba_survey_document(
    state: web::Data<AppState>,
    path: web::Path<String>,
    req: web::Json<DocumentMetadata>,
) -> Result<HttpResponse, AppError>
```

**Request Model:** `DocumentMetadata`
```rust
pub struct DocumentMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: i64,
    pub keterangan: Option<String>,
    pub status: Option<String>,
}
```

**Storage Model:** `Evidence` table
```rust
pub struct Evidence {
    pub id: Option<Thing>,
    pub process_id: String,        // "ba_survey_{id}"
    pub project_id: Thing,
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: i64,
    pub file_category: String,     // Fixed: "ba_survey"
    pub keterangan: String,
    pub status: String,
    pub created_at: Option<Datetime>,
}
```

#### 2. Approval Update Endpoint
**Endpoint:** `PATCH /api/ba-surveys/{id}/approval`

**Handler:** `update_ba_survey_approval` in `ba_survey_handler.rs`
```rust
pub async fn update_ba_survey_approval(
    state: web::Data<AppState>,
    path: web::Path<String>,
    req: web::Json<UpdateApprovalRequest>,
) -> Result<HttpResponse, AppError>
```

**Request Model:** `UpdateApprovalRequest`
```rust
pub struct UpdateApprovalRequest {
    pub approved_by_user1: Option<bool>,
    pub approved_by_user2: Option<bool>,
}
```

### ❌ MISSING FEATURES

The backend **DOES NOT** support:

1. **No `document_type` field** in `DocumentMetadata` or `Evidence`
   - Cannot differentiate between MITRA signature and WASPANG signature
   - `file_category` is hardcoded to `"ba_survey"` for all BA Survey documents

2. **No signature-specific upload endpoint**
   - Current endpoint only accepts metadata (file_path, file_name, etc.)
   - No multipart/form-data upload support for actual file upload
   - Assumes file is already uploaded to server

3. **No signature storage in approval fields**
   - `approved_by_user1` and `approved_by_user2` are only boolean flags
   - No reference to signature document IDs

### 🔍 CURRENT FLOW vs EXPECTED FLOW

#### Current Frontend Flow (INCORRECT)
```
1. User clicks "Approve" button
2. Modal opens with PDF preview
3. User draws signature
4. Signature saved to localStorage
5. Hit PATCH /api/ba-surveys/{id}/approval
   - Body: { approved_by_user1: true }
```

#### Expected Flow (USER REQUIREMENT)
```
1. User clicks "Approve" button
2. Modal opens with PDF preview
3. User draws signature
4. Hit POST /api/ba-surveys/{id}/documents (UPLOAD SIGNATURE)
   - Body: FormData with signature image
   - Include document_type: "signature_mitra" or "signature_waspang"
5. Hit PATCH /api/ba-surveys/{id}/approval (UPDATE STATUS)
   - Body: { approved_by_user1: true }
```

### 🚨 BACKEND CHANGES REQUIRED

To support the expected flow, backend needs:

#### 1. Add `document_type` field to Evidence table
```sql
DEFINE FIELD document_type ON evidence TYPE option<string>;
```

#### 2. Update `DocumentMetadata` model
```rust
pub struct DocumentMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: i64,
    pub keterangan: Option<String>,
    pub status: Option<String>,
    pub document_type: Option<String>, // NEW: "signature_mitra", "signature_waspang", etc.
}
```

#### 3. Update `Evidence` model
```rust
pub struct Evidence {
    pub id: Option<Thing>,
    pub process_id: String,
    pub project_id: Thing,
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: i64,
    pub file_category: String,
    pub keterangan: String,
    pub status: String,
    pub created_at: Option<Datetime>,
    pub document_type: Option<String>, // NEW
}
```

#### 4. Create multipart file upload endpoint (OPTIONAL)
If backend wants to handle actual file upload:
```rust
// POST /api/ba-surveys/{id}/upload-signature
pub async fn upload_ba_survey_signature(
    state: web::Data<AppState>,
    path: web::Path<String>,
    payload: Multipart,
) -> Result<HttpResponse, AppError>
```

OR keep current approach where frontend uploads to storage first, then sends metadata.

### 📋 RECOMMENDATION

**Option 1: Backend Changes (RECOMMENDED)**
- Add `document_type` field to Evidence table and models
- Update `save_ba_survey_document` to accept and store `document_type`
- Frontend can then upload signature with proper type differentiation

**Option 2: Frontend Workaround (NOT RECOMMENDED)**
- Use `keterangan` field to store document type (e.g., "Signature MITRA", "Signature WASPANG")
- This is a hack and not semantically correct
- Makes querying signatures difficult

**Option 3: Keep Current Flow (NOT RECOMMENDED)**
- Keep signatures in localStorage only
- Does not meet user requirement
- Signatures not persisted to backend

### ✅ DECISION REQUIRED

**DO NOT PROCEED** with frontend changes until:
1. User confirms which option to take
2. If Option 1: Backend changes must be implemented first
3. If Option 2: User explicitly approves the workaround
4. If Option 3: User explicitly changes requirement

### 📝 NOTES

- Current backend approval system works correctly for boolean flags
- Document upload system works correctly for metadata storage
- Only missing piece is `document_type` differentiation
- All other infrastructure is in place

---

**Status:** ⏸️ BLOCKED - Waiting for user decision on backend changes
**Date:** 2026-05-20
