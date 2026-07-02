/**
 * DRM Upload Helpers
 * 
 * Utilities to parse existing survey data (BOQ, Matrix, Redline) from existing services
 * and upload them to the DRM upload API endpoints.
 * 
 * Used during survey finalization to automatically populate DRM data
 * without requiring manual Excel upload.
 */

import { boqService } from '@/services/boqService';
import { redlineService } from '@/services/redlineService';
import { matrixService } from '@/services/matrixService';
import { spanService } from '@/services/spanService';
import { authService } from '@/services/authService';
import { API_CONFIG } from '@/config/api';

// =====================================================================
// 1. UPLOAD BOQ DATA TO DRM
// =====================================================================
export async function uploadBOQToDRM(
  projectId: string,
  linkId: string,
  linkName?: string,
  projectName?: string
): Promise<void> {
  console.log('📤 [DRM Upload] Fetching BOQ data for upload...');
  
  // 1. Fetch existing BOQ data from survey service
  const data = await boqService.getBOQMatrixByProjectId(projectId, linkId);
  const boqItems = data?.items || [];
  
  if (boqItems.length === 0) {
    console.warn('⚠️ [DRM Upload] No BOQ items found for this link, skipping upload');
    return;
  }
  
  // 2. Parse BOQ items into the format expected by the DRM upload API
  // Each item becomes a JSON object in the doc array
  const doc = boqItems
    .filter((item: any) => !item.isSummaryRow) // exclude summary rows
    .map((item: any, index: number) => ({
      no: index + 1,
      designator: item.designator || '',
      uraian_pekerjaan: item.uraianPekerjaan || item.uraian_pekerjaan || '',
      satuan: item.satuan || '',
      harga_satuan_material: Number(item.hargaSatuanMaterial || item.harga_satuan_material || item.material) || 0,
      harga_satuan_jasa: Number(item.hargaSatuanJasa || item.harga_satuan_jasa || item.jasa) || 0,
      drm: Number(item.drm) || 0,
      actual: Number(item.actual || item.planned) || 0,
      tambah: Number(item.tambah) || 0,
      kurang: Number(item.kurang) || 0,
    }));

  console.log(`📤 [DRM Upload] Uploading ${doc.length} BOQ items to DRM...`);

  // 3. Hit the DRM upload API
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/boq-drm/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      project_name: projectName || undefined,
      link_id: linkId,
      link_name: linkName || undefined,
      doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`BOQ DRM upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [DRM Upload] BOQ data uploaded to DRM successfully');
}

// =====================================================================
// 2. UPLOAD MATRIX DATA TO DRM
// =====================================================================
export async function uploadMatrixToDRM(
  projectId: string,
  linkId: string,
  linkName?: string,
  projectName?: string
): Promise<void> {
  console.log('📤 [DRM Upload] Fetching Matrix data for upload...');
  
  // 1. Fetch spans for this link to filter
  const spansForLink = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
  const spanIdsForLink = new Set(
    spansForLink.map((span: any) => {
      if (typeof span.id === 'string') return span.id;
      if (span.id && typeof span.id === 'object') {
        const nestedId = (span.id as any).id;
        if (typeof nestedId === 'string') return nestedId;
        if (nestedId && nestedId.String) return nestedId.String;
      }
      return '';
    }).filter(Boolean)
  );

  // 2. Fetch raw matrix data
  const matrixResponse = await matrixService.getMatrixByProjectId(projectId);

  // 3. Transform matrix spans into array for DRM doc
  // Each span becomes an object in the doc array with its span_items
  const doc: any[] = [];

  matrixResponse.spans.forEach((span: any) => {
    let spanId = '';
    if (typeof span.id === 'string') {
      spanId = span.id;
    } else if (span.id && typeof span.id === 'object') {
      const nestedId = (span.id as any).id;
      if (typeof nestedId === 'string') {
        spanId = nestedId;
      } else if (nestedId && nestedId.String) {
        spanId = nestedId.String;
      }
    }

    // Filter: only spans belonging to this link
    if (!spanIdsForLink.has(spanId)) return;

    // Build span object with all its items
    const spanDoc: any = {
      span_name: span.span_name,
      span_items: (span.span_items || []).map((item: any) => {
        // Include all fields from the item
        const parsedItem: any = {
          offset: item.offset,
          offset_from: item.offset_from,
          offset_to: item.offset_to,
          length: item.length,
          depth: item.depth,
          designator: item.designator || '',
          bm: Number(item.bm) || 0,
          s3: Number(item.s3) || 0,
          ds: Number(item.ds) || 0,
          bss: Number(item.bss) || 0,
          bts: Number(item.bts) || 0,
          da: Number(item.da) || 0,
          hps1: Number(item.hps1) || 0,
          hps2: Number(item.hps2) || 0,
          slack_berbayar: Number(item.slack_berbayar) || 0,
          fo_total: Number(item.fo_total) || 0,
          slack_tidak_berbayar: Number(item.slack_tidak_berbayar) || 0,
          tol_2_persen: Number(item.tol_2_persen) || 0,
          pengadaan: Number(item.pengadaan) || 0,
        };

        // Include designator_mapping if present
        if (item.designator_mapping) {
          parsedItem.designator_mapping = item.designator_mapping;
        }

        // Include any dynamic designator fields
        const excludedFields = new Set([
          'id', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator',
          'slack_berbayar', 'fo_total', 'slack_tidak_berbayar', 'tol_2_persen', 'pengadaan',
          'bm', 's3', 'ds', 'bss', 'bts', 'da', 'hps1', 'hps2', 'designator_mapping'
        ]);
        Object.keys(item).forEach(key => {
          if (!excludedFields.has(key)) {
            const val = parseFloat(item[key]);
            parsedItem[key] = !isNaN(val) ? val : item[key];
          }
        });

        return parsedItem;
      }),
    };

    doc.push(spanDoc);
  });

  if (doc.length === 0) {
    console.warn('⚠️ [DRM Upload] No Matrix spans found for this link, skipping upload');
    return;
  }

  console.log(`📤 [DRM Upload] Uploading ${doc.length} Matrix spans to DRM...`);

  // 4. Hit the DRM upload API
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/matrix-drm/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      project_name: projectName || undefined,
      link_id: linkId,
      link_name: linkName || undefined,
      doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Matrix DRM upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [DRM Upload] Matrix data uploaded to DRM successfully');
}

// =====================================================================
// 3. UPLOAD REDLINE DATA TO DRM
// =====================================================================
export async function uploadRedlineToDRM(
  projectId: string,
  linkId: string,
  linkName?: string,
  projectName?: string
): Promise<void> {
  console.log('📤 [DRM Upload] Fetching Redline data for upload...');
  
  // 1. Fetch existing redline data from survey service
  const data = await redlineService.getRedlineByProject(projectId);
  
  // 2. Filter redline spans for this link only
  const spansForLink = (data || []).filter((span: any) => {
    const spanLinkId = typeof span.link_id === 'string' ? span.link_id :
                      (span.link_id?.id?.String || span.link_id?.String || '');
    return spanLinkId === linkId;
  });

  if (spansForLink.length === 0) {
    console.warn('⚠️ [DRM Upload] No Redline spans found for this link, skipping upload');
    return;
  }

  // 3. Parse redline spans into DRM doc format
  // Each span becomes an object with its items
  const doc = spansForLink.map((span: any) => ({
    span_name: span.span_name,
    span_items: (span.span_items || []).map((item: any) => ({
      item_name: item.item_name || item.designator || '',
      designator: item.designator || item.item_name || '',
      length: Number(item.length) || 0,
      redline: Number(item.redline) || 0,
      cumulative: Number(item.cumulative) || 0,
    })),
  }));

  console.log(`📤 [DRM Upload] Uploading ${doc.length} Redline spans to DRM...`);

  // 4. Hit the DRM upload API
  const token = authService.getToken();
  const response = await fetch(`${API_CONFIG.BASE_URL}/redline-drm/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      project_name: projectName || undefined,
      link_id: linkId,
      link_name: linkName || undefined,
      doc,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Redline DRM upload failed: ${response.status} - ${errorBody}`);
  }

  console.log('✅ [DRM Upload] Redline data uploaded to DRM successfully');
}
