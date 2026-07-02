// Field order matching the table column order
export const HIERARCHY_FIELD_ORDER = [
  // Basic Fields (32 columns)
  'wpid',
  'portfolio',
  'lop',
  'project_name',
  'sid',
  'io',
  'customer',
  'segment',
  'product',
  'regional_ti',
  'regional_cust',
  'pic_egm',
  'pic_spm_hq',
  'pic_pm_hq',
  'pic_pm_regional',
  'po_number',
  'po_customer',
  'po_year',
  'po_release_date',
  'po_end_date',
  'po_description',
  'po_value_idr',
  'po_site_id',
  'po_site_name',
  'actual_site_id',
  'actual_site_name',
  'installation_tools',
  'hse_tools',
  'target_qty',
  'target_unit',
  'mitra',
  
  // KOM (9 fields)
  'kom_plan_start_date',
  'kom_plan_end_date',
  'kom_plan_qty',
  'kom_unit',
  'kom_plan_progress',
  'kom_actual_start_date',
  'kom_actual_end_date',
  'kom_actual_value',
  'kom_actual_progress',
  
  // Survey (9 fields)
  'survey_plan_start_date',
  'survey_plan_end_date',
  'survey_plan_qty',
  'survey_unit',
  'survey_plan_progress',
  'survey_actual_start_date',
  'survey_actual_end_date',
  'survey_actual_value',
  'survey_actual_progress',
  
  // DRM (9 fields)
  'drm_plan_start_date',
  'drm_plan_end_date',
  'drm_plan_qty',
  'drm_unit',
  'drm_plan_progress',
  'drm_actual_start_date',
  'drm_actual_end_date',
  'drm_actual_value',
  'drm_actual_progress',
  
  // Material Order (9 fields)
  'mo_plan_start_date',
  'mo_plan_end_date',
  'mo_plan_qty',
  'mo_unit',
  'mo_plan_progress',
  'mo_actual_start_date',
  'mo_actual_end_date',
  'mo_actual_value',
  'mo_actual_progress',
  
  // Material Shipment (9 fields)
  'ms_plan_start_date',
  'ms_plan_end_date',
  'ms_plan_qty',
  'ms_unit',
  'ms_plan_progress',
  'ms_actual_start_date',
  'ms_actual_end_date',
  'ms_actual_value',
  'ms_actual_progress',
  
  // Material On WH (9 fields)
  'mwh_plan_start_date',
  'mwh_plan_end_date',
  'mwh_plan_qty',
  'mwh_unit',
  'mwh_plan_progress',
  'mwh_actual_start_date',
  'mwh_actual_end_date',
  'mwh_actual_value',
  'mwh_actual_progress',
  
  // Material Delivery (9 fields)
  'md_plan_start_date',
  'md_plan_end_date',
  'md_plan_qty',
  'md_unit',
  'md_plan_progress',
  'md_actual_start_date',
  'md_actual_end_date',
  'md_actual_value',
  'md_actual_progress',
  
  // Material Delivery to Site (9 fields)
  'mdts_plan_start_date',
  'mdts_plan_end_date',
  'mdts_plan_qty',
  'mdts_unit',
  'mdts_plan_progress',
  'mdts_actual_start_date',
  'mdts_actual_end_date',
  'mdts_actual_value',
  'mdts_actual_progress',
  
  // Material on Site (9 fields)
  'mos_plan_start_date',
  'mos_plan_end_date',
  'mos_plan_qty',
  'mos_unit',
  'mos_plan_progress',
  'mos_actual_start_date',
  'mos_actual_end_date',
  'mos_actual_value',
  'mos_actual_progress',
  
  // Pengurusan Izin Kerja (9 fields)
  'pik_plan_start_date',
  'pik_plan_end_date',
  'pik_plan_qty',
  'pik_unit',
  'pik_plan_progress',
  'pik_actual_start_date',
  'pik_actual_end_date',
  'pik_actual_value',
  'pik_actual_progress',
  
  // Penggalian Tanah dan Penanaman HDPE (9 fields)
  'pth_plan_start_date',
  'pth_plan_end_date',
  'pth_plan_qty',
  'pth_unit',
  'pth_plan_progress',
  'pth_actual_start_date',
  'pth_actual_end_date',
  'pth_actual_value',
  'pth_actual_progress',
  
  // Instalasi Jembatan (9 fields)
  'ij_plan_start_date',
  'ij_plan_end_date',
  'ij_plan_qty',
  'ij_unit',
  'ij_plan_progress',
  'ij_actual_start_date',
  'ij_actual_end_date',
  'ij_actual_value',
  'ij_actual_progress',
  
  // Penarikan Kabel (9 fields)
  'pk_plan_start_date',
  'pk_plan_end_date',
  'pk_plan_qty',
  'pk_unit',
  'pk_plan_progress',
  'pk_actual_start_date',
  'pk_actual_end_date',
  'pk_actual_value',
  'pk_actual_progress',
  
  // Joint dan Terminasi (9 fields)
  'jt_plan_start_date',
  'jt_plan_end_date',
  'jt_plan_qty',
  'jt_unit',
  'jt_plan_progress',
  'jt_actual_start_date',
  'jt_actual_end_date',
  'jt_actual_value',
  'jt_actual_progress',
  
  // Test Commisioning (9 fields)
  'tc_plan_start_date',
  'tc_plan_end_date',
  'tc_plan_qty',
  'tc_unit',
  'tc_plan_progress',
  'tc_actual_start_date',
  'tc_actual_end_date',
  'tc_actual_value',
  'tc_actual_progress',
  
  // BAUT (9 fields)
  'baut_plan_start_date',
  'baut_plan_end_date',
  'baut_plan_qty',
  'baut_unit',
  'baut_plan_progress',
  'baut_actual_start_date',
  'baut_actual_end_date',
  'baut_actual_value',
  'baut_actual_progress',
  
  // BAUT 1 (9 fields)
  'baut1_plan_start_date',
  'baut1_plan_end_date',
  'baut1_plan_qty',
  'baut1_unit',
  'baut1_plan_progress',
  'baut1_actual_start_date',
  'baut1_actual_end_date',
  'baut1_actual_value',
  'baut1_actual_progress',
  
  // BAST (9 fields)
  'bast_plan_start_date',
  'bast_plan_end_date',
  'bast_plan_qty',
  'bast_unit',
  'bast_plan_progress',
  'bast_actual_start_date',
  'bast_actual_end_date',
  'bast_actual_value',
  'bast_actual_progress',
  
  // Final Fields (9 columns)
  'current_position',
  'bast_total_idr',
  'remaining_po',
  'final_rekon_amount_idr',
  'final_rekon_reason',
  'remaining_final',
  'invoice_idr',
  'status_project',
];

export function sortFieldsByTableOrder(fields: Array<{ key: string; value: any }>): Array<{ key: string; value: any }> {
  return fields.sort((a, b) => {
    const indexA = HIERARCHY_FIELD_ORDER.indexOf(a.key);
    const indexB = HIERARCHY_FIELD_ORDER.indexOf(b.key);
    
    // If both fields are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // If neither is in the list, sort alphabetically
    return a.key.localeCompare(b.key);
  });
}
