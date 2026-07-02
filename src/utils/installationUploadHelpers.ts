/**
 * Installation Upload Helpers
 * 
 * Utilities to fetch existing DRM data (BOQ, Matrix, Redline) from the DRM tables
 * and upload them to the Installation upload API endpoints.
 * 
 * Used during DRM finalization to automatically populate Installation data
 * without requiring manual Excel upload.
 * 
 * Flow: DRM data (boq_drm, matrix_drm, redline_drm) → Installation data (boq_installasi, matrix_installasi, redline_installasi)
 */

import { drmUploadService } from '@/services/drmUploadService';
import { authService } from '@/services/authService';
import { API_CONFIG } from '@/config/api';

// =====================================================================
// 1. UPLOAD BOQ DRM → BOQ INSTALLASI
// =====================================================================
export async function uploadBOQToInstallation(
  projectId: string,
  linkId: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.log('📤 [Installation Upload] Fetching BOQ DRM data for installation upload...');

  // 1. Fetch latest BOQ DRM data for this link
  const latestBoq = await drmUploadService.getLatestByLink('boq', linkId);

  if (!latestBoq || !latestBoq.doc || latestBoq.doc.length === 0) {
    console.warn('⚠️ [Installation Upload] No BOQ DRM data found for this link, skipping upload');
    return { success: true, skipped: true };
  }

  console.log(`📤 [Installation Upload] Uploading ${latestBoq.doc.length} BOQ items to installation...`);

  // 2. Upload to boq-installasi using the same doc format
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/boq-installasi/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      link_id: linkId,
      doc: latestBoq.doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`BOQ Installation upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [Installation Upload] BOQ data uploaded to installation successfully');
  return { success: true };
}

// =====================================================================
// 2. UPLOAD MATRIX DRM → MATRIX INSTALLASI
// =====================================================================
export async function uploadMatrixToInstallation(
  projectId: string,
  linkId: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.log('📤 [Installation Upload] Fetching Matrix DRM data for installation upload...');

  // 1. Fetch latest Matrix DRM data for this link
  const latestMatrix = await drmUploadService.getLatestByLink('matrix', linkId);

  if (!latestMatrix || !latestMatrix.doc || latestMatrix.doc.length === 0) {
    console.warn('⚠️ [Installation Upload] No Matrix DRM data found for this link, skipping upload');
    return { success: true, skipped: true };
  }

  console.log(`📤 [Installation Upload] Uploading ${latestMatrix.doc.length} Matrix spans to installation...`);

  // 2. Upload to matrix-installasi using the same doc format
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/matrix-installasi/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      link_id: linkId,
      doc: latestMatrix.doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Matrix Installation upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [Installation Upload] Matrix data uploaded to installation successfully');
  return { success: true };
}

// =====================================================================
// 3. UPLOAD REDLINE DRM → REDLINE INSTALLASI
// =====================================================================
export async function uploadRedlineToInstallation(
  projectId: string,
  linkId: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.log('📤 [Installation Upload] Fetching Redline DRM data for installation upload...');

  // 1. Fetch latest Redline DRM data for this link
  const latestRedline = await drmUploadService.getLatestByLink('redline', linkId);

  if (!latestRedline || !latestRedline.doc || latestRedline.doc.length === 0) {
    console.warn('⚠️ [Installation Upload] No Redline DRM data found for this link, skipping upload');
    return { success: true, skipped: true };
  }

  console.log(`📤 [Installation Upload] Uploading ${latestRedline.doc.length} Redline spans to installation...`);

  // 2. Upload to redline-installasi using the same doc format
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/redline-installasi/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      link_id: linkId,
      doc: latestRedline.doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Redline Installation upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [Installation Upload] Redline data uploaded to installation successfully');
  return { success: true };
}
