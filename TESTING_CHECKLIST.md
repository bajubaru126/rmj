# ✅ BA Survey Approval - Testing Checklist

## 🎯 Pre-Testing Setup

### Backend
- [ ] Backend running: `cd rmj-be-v1 && cargo run`
- [ ] Check logs: Backend started successfully
- [ ] Verify route: `POST /api/ba-surveys/{id}/upload-signature` registered
- [ ] Verify route: `PATCH /api/ba-surveys/{id}/approval` registered

### Frontend
- [ ] Frontend running: `cd rmj-new-design && npm run dev`
- [ ] No console errors on startup
- [ ] Can access Survey page
- [ ] Can login successfully

---

## 🧪 Test Scenarios

### Scenario 1: MITRA Approval (User1)

#### Steps:
1. [ ] Navigate to Survey page
2. [ ] Find a BA Survey that is NOT approved yet
3. [ ] Click **"Approve"** button
4. [ ] Verify modal opens with:
   - [ ] PDF preview on left side
   - [ ] Signature areas on right sidebar
   - [ ] MITRA signature box is clickable
   - [ ] WASPANG signature box is clickable
5. [ ] Click **MITRA signature box**
6. [ ] Verify signature pad modal opens
7. [ ] Draw a signature
8. [ ] Click **"Simpan & Setujui"**

#### Expected Results:
- [ ] Loading indicator appears
- [ ] Console logs show:
  ```
  🔄 Starting approval flow: { baSurveyId: "xxx", documentType: "signature_mitra" }
  ✅ Signature converted to Blob
  📤 Uploading signature...
  ✅ Signature uploaded successfully
  ✅ Signature saved to localStorage
  📤 Updating approval status...
  ✅ Approval flow completed successfully
  ```
- [ ] Signature appears in MITRA box
- [ ] Green checkmark appears next to "MITRA"
- [ ] Signature pad modal closes
- [ ] No error alerts

#### Backend Verification:
- [ ] Check file exists: `uploads/ba_survey/signatures/ba_survey_sig_xxx_*.png`
- [ ] Check database: Evidence record created with `document_type: "signature_mitra"`
- [ ] Check BA Survey: `approved_by_user1: true`

---

### Scenario 2: WASPANG Approval (User2)

#### Steps:
1. [ ] Use same BA Survey from Scenario 1
2. [ ] Click **"Approve"** button again
3. [ ] Verify MITRA signature still visible
4. [ ] Click **WASPANG signature box**
5. [ ] Draw a different signature
6. [ ] Click **"Simpan & Setujui"**

#### Expected Results:
- [ ] Loading indicator appears
- [ ] Console logs show success for `signature_waspang`
- [ ] Signature appears in WASPANG box
- [ ] Green checkmark appears next to "TELKOM WASPANG"
- [ ] Success message box appears: "Dokumen Lengkap - Semua pihak telah menyetujui dokumen ini"
- [ ] Both signatures visible in modal

#### Backend Verification:
- [ ] Check file exists: `uploads/ba_survey/signatures/ba_survey_sig_xxx_*.png` (2 files)
- [ ] Check database: 2 Evidence records (one for each signature)
- [ ] Check BA Survey: `approved_by_user1: true` AND `approved_by_user2: true`

---

### Scenario 3: Already Approved Signature

#### Steps:
1. [ ] Open approval modal for BA Survey with existing MITRA approval
2. [ ] Try to click MITRA signature box

#### Expected Results:
- [ ] MITRA signature box is disabled (cursor: not-allowed)
- [ ] Green border on MITRA box
- [ ] Checkmark visible
- [ ] Signature pad does NOT open
- [ ] WASPANG box still clickable (if not approved)

---

### Scenario 4: Download PDF

#### Steps:
1. [ ] Open approval modal
2. [ ] Click **"Unduh Dokumen"** button

#### Expected Results:
- [ ] PDF file downloads
- [ ] Filename format: `BA_Survey_{lokasi}_{date}.pdf`
- [ ] PDF contains all BA Survey data
- [ ] PDF opens successfully

---

### Scenario 5: Error Handling

#### Test 5a: Network Error
1. [ ] Stop backend
2. [ ] Try to approve with signature
3. [ ] Verify error alert appears
4. [ ] Verify signature pad stays open
5. [ ] Verify no partial data saved

#### Test 5b: Empty Signature
1. [ ] Open signature pad
2. [ ] Click "Simpan & Setujui" WITHOUT drawing
3. [ ] Verify alert: "Silakan buat tanda tangan terlebih dahulu"
4. [ ] Verify signature pad stays open

#### Test 5c: Invalid Token
1. [ ] Clear localStorage token
2. [ ] Try to approve
3. [ ] Verify 401 error handled
4. [ ] Verify user redirected to login (if implemented)

---

## 🔍 Console Verification

### Frontend Console (Success Flow)
```javascript
// Step 1: Start approval
🔄 Starting approval flow: { 
  baSurveyId: "ba_survey:xxx", 
  documentType: "signature_mitra" 
}

// Step 2: Convert signature
✅ Signature converted to Blob: 12345 bytes

// Step 3: Upload
📤 Uploading signature...
📤 Uploading signature: { 
  id: "ba_survey:xxx", 
  documentType: "signature_mitra", 
  fileName: "signature_signature_mitra_1716192000000.png" 
}

// Step 4: Success
✅ Signature uploaded: { 
  success: true, 
  message: "Signature uploaded successfully",
  evidence_id: "evidence:xxx",
  file_path: "uploads/ba_survey/signatures/ba_survey_sig_xxx_1716192000000.png",
  document_type: "signature_mitra"
}

// Step 5: Save to localStorage
✅ Signature saved to localStorage

// Step 6: Update approval
📤 Updating BA Survey approval: ba_survey:xxx { approved_by_user1: true }

// Step 7: Complete
✅ Approval updated: { 
  success: true, 
  message: "BA Survey approval updated successfully",
  approved_by_user1: true,
  approved_by_user2: false
}
✅ Approval flow completed successfully
```

### Backend Console (Success Flow)
```
[INFO] actix_web::middleware::logger - "POST /api/ba-surveys/ba_survey:xxx/upload-signature HTTP/1.1" 201
[INFO] Processing multipart upload for BA Survey: ba_survey:xxx
[INFO] File saved: uploads/ba_survey/signatures/ba_survey_sig_xxx_1716192000000.png
[INFO] Evidence created with document_type: signature_mitra
[INFO] actix_web::middleware::logger - "PATCH /api/ba-surveys/ba_survey:xxx/approval HTTP/1.1" 200
```

---

## 📊 Database Verification

### Query Evidence Records
```sql
-- Check signatures for specific BA Survey
SELECT * FROM evidence 
WHERE process_id = "ba_survey_xxx" 
  AND document_type IN ["signature_mitra", "signature_waspang"];

-- Expected result: 2 records (one for each signature)
```

### Query BA Survey Approval Status
```sql
-- Check approval status
SELECT id, approved_by_user1, approved_by_user2 
FROM ba_survey 
WHERE id = "ba_survey:xxx";

-- Expected result:
-- approved_by_user1: true
-- approved_by_user2: true
```

---

## 📁 File System Verification

### Check Uploaded Files
```bash
# Windows
dir "d:\Uzil\Smartelco\RMJ\main-project\rmj-be-v1\uploads\ba_survey\signatures"

# Expected files:
# ba_survey_sig_xxx_1716192000000.png (MITRA)
# ba_survey_sig_xxx_1716192000001.png (WASPANG)
```

### Check File Properties
- [ ] File size > 0 bytes
- [ ] File type: PNG image
- [ ] File can be opened in image viewer
- [ ] Signature is visible and clear

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to upload signature: 400"
**Cause:** Missing or invalid `document_type`  
**Solution:** Check that `documentType` is exactly "signature_mitra" or "signature_waspang"

### Issue 2: "Failed to upload signature: 401"
**Cause:** Missing or expired token  
**Solution:** Re-login to get fresh token

### Issue 3: Signature not appearing in modal
**Cause:** localStorage not updated  
**Solution:** Check browser console for errors, verify localStorage key format

### Issue 4: Backend route not found (404)
**Cause:** Route not registered or backend not running  
**Solution:** Restart backend, check `ba_survey_routes.rs`

### Issue 5: CORS error
**Cause:** Frontend and backend on different origins  
**Solution:** Check CORS configuration in backend

---

## ✅ Final Checklist

### Code Quality
- [x] Backend compiles without errors (`cargo check`)
- [x] Frontend has no TypeScript errors
- [x] All imports are correct
- [x] No console warnings in browser
- [x] No unused variables

### Functionality
- [ ] Can upload MITRA signature
- [ ] Can upload WASPANG signature
- [ ] Signatures persist in database
- [ ] Signatures display in modal
- [ ] Approval status updates correctly
- [ ] PDF download works
- [ ] Error handling works

### Documentation
- [x] API documentation complete
- [x] Integration guide complete
- [x] Testing checklist complete
- [x] Database schema documented

### Deployment Ready
- [ ] All tests passed
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Ready for UAT

---

## 📝 Test Results Log

### Test Date: ___________
### Tester: ___________

| Scenario | Status | Notes |
|----------|--------|-------|
| MITRA Approval | ⬜ Pass / ⬜ Fail | |
| WASPANG Approval | ⬜ Pass / ⬜ Fail | |
| Already Approved | ⬜ Pass / ⬜ Fail | |
| Download PDF | ⬜ Pass / ⬜ Fail | |
| Error Handling | ⬜ Pass / ⬜ Fail | |

### Issues Found:
1. 
2. 
3. 

### Overall Status: ⬜ PASS / ⬜ FAIL

---

**Created:** 2026-05-20  
**Status:** Ready for Testing
