import { Eye, Edit, Trash2 } from 'lucide-react';
import { HierarchyResponse } from '@/services/hierarchyService';
import './HierarchyTable.css';

interface HierarchyTableProps {
  hierarchies: HierarchyResponse[];
  onView: (hierarchy: HierarchyResponse) => void;
  onEdit: (hierarchy: HierarchyResponse) => void;
  onDelete: (id: string) => void;
  getHierarchyId: (id: any) => string;
}

export function HierarchyTable({ hierarchies, onView, onEdit, onDelete, getHierarchyId }: HierarchyTableProps) {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString('id-ID');
    }
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      const date = new Date(value);
      // Check if it's dummy date (1900-01-01)
      if (date.getFullYear() === 1900) return '-';
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return String(value);
  };

  return (
    <div className="hierarchy-table-container">
      <table className="hierarchy-table">
        <thead>
          {/* Row 1: Main Headers */}
          <tr className="header-row-1">
            <th rowSpan={3} className="basic-header">No</th>
            <th rowSpan={3} className="basic-header">WPID</th>
            <th rowSpan={3} className="basic-header">Portfolio</th>
            <th rowSpan={3} className="basic-header">LOP</th>
            <th rowSpan={3} className="basic-header">Project Name</th>
            <th rowSpan={3} className="basic-header">SID</th>
            <th rowSpan={3} className="basic-header">IO</th>
            <th rowSpan={3} className="basic-header">Customer</th>
            <th rowSpan={3} className="basic-header">Segment</th>
            <th rowSpan={3} className="basic-header">Product</th>
            <th rowSpan={3} className="basic-header">Regional TI</th>
            <th rowSpan={3} className="basic-header">Regional Cust</th>
            <th rowSpan={3} className="basic-header">PIC EGM</th>
            <th rowSpan={3} className="basic-header">PIC SPM HQ</th>
            <th rowSpan={3} className="basic-header">PIC PM HQ</th>
            <th rowSpan={3} className="basic-header">PIC PM Regional</th>
            <th rowSpan={3} className="basic-header">PO Number</th>
            <th rowSpan={3} className="basic-header">PO Customer</th>
            <th rowSpan={3} className="basic-header">PO Year</th>
            <th rowSpan={3} className="basic-header">PO Release Date</th>
            <th rowSpan={3} className="basic-header">PO End Date</th>
            <th rowSpan={3} className="basic-header">PO / Program Description</th>
            <th rowSpan={3} className="basic-header">PO Value (IDR)</th>
            <th rowSpan={3} className="basic-header">PO Site/Unit/SN ID</th>
            <th rowSpan={3} className="basic-header">PO Site/Unit/SN Name</th>
            <th rowSpan={3} className="basic-header">Actual Site ID</th>
            <th rowSpan={3} className="basic-header">Actual Site/Unit Name</th>
            <th rowSpan={3} className="basic-header">Installation Tools</th>
            <th rowSpan={3} className="basic-header">HSE Tools / APD</th>
            <th rowSpan={3} className="basic-header">Target Qty</th>
            <th rowSpan={3} className="basic-header">Unit</th>
            <th rowSpan={3} className="basic-header">Mitra</th>
            
            {/* Perizinan Group */}
            <th colSpan={27} className="group-header perizinan-group">Perizinan</th>
            
            {/* Material Group */}
            <th colSpan={54} className="group-header material-group">Material</th>
            
            {/* Implementasi Group */}
            <th colSpan={54} className="group-header implementasi-group">Implementasi</th>
            
            {/* Uji Terima Group */}
            <th colSpan={18} className="group-header uji-terima-group">Uji Terima</th>
            
            {/* BAST Group */}
            <th colSpan={9} className="group-header bast-group">BAST</th>
            
            <th rowSpan={3} className="basic-header">Current Position</th>
            <th rowSpan={3} className="basic-header">Bast Total (IDR)</th>
            <th rowSpan={3} className="basic-header">Remaining PO</th>
            
            {/* Final Rekon Group */}
            <th colSpan={2} className="group-header final-rekon-group">Final Rekon</th>
            
            <th rowSpan={3} className="basic-header">Remaining Final</th>
            <th rowSpan={3} className="basic-header">Invoice (IDR)</th>
            <th rowSpan={3} className="basic-header">Status Project</th>
            <th rowSpan={3} className="action-header">Action</th>
          </tr>

          {/* Row 2: Sub Headers (Phase Names) */}
          <tr className="header-row-2">
            {/* Perizinan Sub-groups */}
            <th colSpan={9} className="phase-header">Kick Of Meeting</th>
            <th colSpan={9} className="phase-header">Survey</th>
            <th colSpan={9} className="phase-header">Design Review Meeting</th>
            
            {/* Material Sub-groups */}
            <th colSpan={9} className="phase-header">Material Order</th>
            <th colSpan={9} className="phase-header">Material Shipment</th>
            <th colSpan={9} className="phase-header">Material On WH</th>
            <th colSpan={9} className="phase-header">Material Delivery</th>
            <th colSpan={9} className="phase-header">Material Delivery to Site</th>
            <th colSpan={9} className="phase-header">Material on Site</th>
            
            {/* Implementasi Sub-groups */}
            <th colSpan={9} className="phase-header">Pengurusan Izin Kerja</th>
            <th colSpan={9} className="phase-header">Penggalian Tanah dan Penanaman HDPE</th>
            <th colSpan={9} className="phase-header">Instalasi Jembatan</th>
            <th colSpan={9} className="phase-header">Penarikan Kabel</th>
            <th colSpan={9} className="phase-header">Joint dan Terminasi</th>
            <th colSpan={9} className="phase-header">Test Commisioning</th>
            
            {/* Uji Terima Sub-groups */}
            <th colSpan={9} className="phase-header">BAUT</th>
            <th colSpan={9} className="phase-header">BAUT 1</th>
            
            {/* BAST Sub-group */}
            <th colSpan={9} className="phase-header">BAST</th>
            
            {/* Final Rekon Sub-fields */}
            <th rowSpan={2} className="field-header">Amount (IDR)</th>
            <th rowSpan={2} className="field-header">Reason</th>
          </tr>

          {/* Row 3: Field Names (Detail Fields) */}
          <tr className="header-row-3">
            {/* Repeat 18 times for all phases (Perizinan: 3, Material: 6, Implementasi: 6, Uji Terima: 2, BAST: 1) */}
            {Array.from({ length: 18 }).map((_, idx) => (
              <>
                <th className="field-header">Plan Start Date</th>
                <th className="field-header">Plan End Date</th>
                <th className="field-header">Plan Qty</th>
                <th className="field-header">Unit</th>
                <th className="field-header">Plan Progress (%)</th>
                <th className="field-header">Actual Start Date</th>
                <th className="field-header">Actual End Date</th>
                <th className="field-header">Actual Value</th>
                <th className="field-header">Actual Progress (%)</th>
              </>
            ))}
          </tr>
        </thead>

        <tbody>
          {hierarchies.length === 0 ? (
            <tr>
              <td colSpan={203} className="empty-state">
                No hierarchy data found
              </td>
            </tr>
          ) : (
            hierarchies.map((h, idx) => (
              <tr key={getHierarchyId(h.id)} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
                {/* Basic Fields */}
                <td>{idx + 1}</td>
                <td>{formatValue(h.wpid)}</td>
                <td>{formatValue(h.portfolio)}</td>
                <td>{formatValue(h.lop)}</td>
                <td>{formatValue(h.project_name)}</td>
                <td>{formatValue(h.sid)}</td>
                <td>{formatValue(h.io)}</td>
                <td>{formatValue(h.customer)}</td>
                <td>{formatValue(h.segment)}</td>
                <td>{formatValue(h.product)}</td>
                <td>{formatValue(h.regional_ti)}</td>
                <td>{formatValue(h.regional_cust)}</td>
                <td>{formatValue(h.pic_egm)}</td>
                <td>{formatValue(h.pic_spm_hq)}</td>
                <td>{formatValue(h.pic_pm_hq)}</td>
                <td>{formatValue(h.pic_pm_regional)}</td>
                <td>{formatValue(h.po_number)}</td>
                <td>{formatValue(h.po_customer)}</td>
                <td>{formatValue(h.po_year)}</td>
                <td>{formatValue(h.po_release_date)}</td>
                <td>{formatValue(h.po_end_date)}</td>
                <td>{formatValue(h.po_description)}</td>
                <td>{formatValue(h.po_value_idr)}</td>
                <td>{formatValue(h.po_site_id)}</td>
                <td>{formatValue(h.po_site_name)}</td>
                <td>{formatValue(h.actual_site_id)}</td>
                <td>{formatValue(h.actual_site_name)}</td>
                <td>{formatValue(h.installation_tools)}</td>
                <td>{formatValue(h.hse_tools)}</td>
                <td>{formatValue(h.target_qty)}</td>
                <td>{formatValue(h.target_unit)}</td>
                <td>{formatValue(h.mitra)}</td>
                
                {/* KOM */}
                <td>{formatValue(h.kom_plan_start_date)}</td>
                <td>{formatValue(h.kom_plan_end_date)}</td>
                <td>{formatValue(h.kom_plan_qty)}</td>
                <td>{formatValue(h.kom_unit)}</td>
                <td>{formatValue(h.kom_plan_progress)}</td>
                <td>{formatValue(h.kom_actual_start_date)}</td>
                <td>{formatValue(h.kom_actual_end_date)}</td>
                <td>{formatValue(h.kom_actual_value)}</td>
                <td>{formatValue(h.kom_actual_progress)}</td>
                
                {/* Survey */}
                <td>{formatValue(h.survey_plan_start_date)}</td>
                <td>{formatValue(h.survey_plan_end_date)}</td>
                <td>{formatValue(h.survey_plan_qty)}</td>
                <td>{formatValue(h.survey_unit)}</td>
                <td>{formatValue(h.survey_plan_progress)}</td>
                <td>{formatValue(h.survey_actual_start_date)}</td>
                <td>{formatValue(h.survey_actual_end_date)}</td>
                <td>{formatValue(h.survey_actual_value)}</td>
                <td>{formatValue(h.survey_actual_progress)}</td>
                
                {/* DRM */}
                <td>{formatValue(h.drm_plan_start_date)}</td>
                <td>{formatValue(h.drm_plan_end_date)}</td>
                <td>{formatValue(h.drm_plan_qty)}</td>
                <td>{formatValue(h.drm_unit)}</td>
                <td>{formatValue(h.drm_plan_progress)}</td>
                <td>{formatValue(h.drm_actual_start_date)}</td>
                <td>{formatValue(h.drm_actual_end_date)}</td>
                <td>{formatValue(h.drm_actual_value)}</td>
                <td>{formatValue(h.drm_actual_progress)}</td>
                
                {/* Material Order */}
                <td>{formatValue(h.mo_plan_start_date)}</td>
                <td>{formatValue(h.mo_plan_end_date)}</td>
                <td>{formatValue(h.mo_plan_qty)}</td>
                <td>{formatValue(h.mo_unit)}</td>
                <td>{formatValue(h.mo_plan_progress)}</td>
                <td>{formatValue(h.mo_actual_start_date)}</td>
                <td>{formatValue(h.mo_actual_end_date)}</td>
                <td>{formatValue(h.mo_actual_value)}</td>
                <td>{formatValue(h.mo_actual_progress)}</td>
                
                {/* Material Shipment */}
                <td>{formatValue(h.ms_plan_start_date)}</td>
                <td>{formatValue(h.ms_plan_end_date)}</td>
                <td>{formatValue(h.ms_plan_qty)}</td>
                <td>{formatValue(h.ms_unit)}</td>
                <td>{formatValue(h.ms_plan_progress)}</td>
                <td>{formatValue(h.ms_actual_start_date)}</td>
                <td>{formatValue(h.ms_actual_end_date)}</td>
                <td>{formatValue(h.ms_actual_value)}</td>
                <td>{formatValue(h.ms_actual_progress)}</td>
                
                {/* Material On WH */}
                <td>{formatValue(h.mwh_plan_start_date)}</td>
                <td>{formatValue(h.mwh_plan_end_date)}</td>
                <td>{formatValue(h.mwh_plan_qty)}</td>
                <td>{formatValue(h.mwh_unit)}</td>
                <td>{formatValue(h.mwh_plan_progress)}</td>
                <td>{formatValue(h.mwh_actual_start_date)}</td>
                <td>{formatValue(h.mwh_actual_end_date)}</td>
                <td>{formatValue(h.mwh_actual_value)}</td>
                <td>{formatValue(h.mwh_actual_progress)}</td>
                
                {/* Material Delivery */}
                <td>{formatValue(h.md_plan_start_date)}</td>
                <td>{formatValue(h.md_plan_end_date)}</td>
                <td>{formatValue(h.md_plan_qty)}</td>
                <td>{formatValue(h.md_unit)}</td>
                <td>{formatValue(h.md_plan_progress)}</td>
                <td>{formatValue(h.md_actual_start_date)}</td>
                <td>{formatValue(h.md_actual_end_date)}</td>
                <td>{formatValue(h.md_actual_value)}</td>
                <td>{formatValue(h.md_actual_progress)}</td>
                
                {/* Material Delivery to Site */}
                <td>{formatValue(h.mdts_plan_start_date)}</td>
                <td>{formatValue(h.mdts_plan_end_date)}</td>
                <td>{formatValue(h.mdts_plan_qty)}</td>
                <td>{formatValue(h.mdts_unit)}</td>
                <td>{formatValue(h.mdts_plan_progress)}</td>
                <td>{formatValue(h.mdts_actual_start_date)}</td>
                <td>{formatValue(h.mdts_actual_end_date)}</td>
                <td>{formatValue(h.mdts_actual_value)}</td>
                <td>{formatValue(h.mdts_actual_progress)}</td>
                
                {/* Material on Site */}
                <td>{formatValue(h.mos_plan_start_date)}</td>
                <td>{formatValue(h.mos_plan_end_date)}</td>
                <td>{formatValue(h.mos_plan_qty)}</td>
                <td>{formatValue(h.mos_unit)}</td>
                <td>{formatValue(h.mos_plan_progress)}</td>
                <td>{formatValue(h.mos_actual_start_date)}</td>
                <td>{formatValue(h.mos_actual_end_date)}</td>
                <td>{formatValue(h.mos_actual_value)}</td>
                <td>{formatValue(h.mos_actual_progress)}</td>
                
                {/* Pengurusan Izin Kerja */}
                <td>{formatValue(h.pik_plan_start_date)}</td>
                <td>{formatValue(h.pik_plan_end_date)}</td>
                <td>{formatValue(h.pik_plan_qty)}</td>
                <td>{formatValue(h.pik_unit)}</td>
                <td>{formatValue(h.pik_plan_progress)}</td>
                <td>{formatValue(h.pik_actual_start_date)}</td>
                <td>{formatValue(h.pik_actual_end_date)}</td>
                <td>{formatValue(h.pik_actual_value)}</td>
                <td>{formatValue(h.pik_actual_progress)}</td>
                
                {/* Penggalian Tanah dan Penanaman HDPE */}
                <td>{formatValue(h.pth_plan_start_date)}</td>
                <td>{formatValue(h.pth_plan_end_date)}</td>
                <td>{formatValue(h.pth_plan_qty)}</td>
                <td>{formatValue(h.pth_unit)}</td>
                <td>{formatValue(h.pth_plan_progress)}</td>
                <td>{formatValue(h.pth_actual_start_date)}</td>
                <td>{formatValue(h.pth_actual_end_date)}</td>
                <td>{formatValue(h.pth_actual_value)}</td>
                <td>{formatValue(h.pth_actual_progress)}</td>
                
                {/* Instalasi Jembatan */}
                <td>{formatValue(h.ij_plan_start_date)}</td>
                <td>{formatValue(h.ij_plan_end_date)}</td>
                <td>{formatValue(h.ij_plan_qty)}</td>
                <td>{formatValue(h.ij_unit)}</td>
                <td>{formatValue(h.ij_plan_progress)}</td>
                <td>{formatValue(h.ij_actual_start_date)}</td>
                <td>{formatValue(h.ij_actual_end_date)}</td>
                <td>{formatValue(h.ij_actual_value)}</td>
                <td>{formatValue(h.ij_actual_progress)}</td>
                
                {/* Penarikan Kabel */}
                <td>{formatValue(h.pk_plan_start_date)}</td>
                <td>{formatValue(h.pk_plan_end_date)}</td>
                <td>{formatValue(h.pk_plan_qty)}</td>
                <td>{formatValue(h.pk_unit)}</td>
                <td>{formatValue(h.pk_plan_progress)}</td>
                <td>{formatValue(h.pk_actual_start_date)}</td>
                <td>{formatValue(h.pk_actual_end_date)}</td>
                <td>{formatValue(h.pk_actual_value)}</td>
                <td>{formatValue(h.pk_actual_progress)}</td>
                
                {/* Joint dan Terminasi */}
                <td>{formatValue(h.jt_plan_start_date)}</td>
                <td>{formatValue(h.jt_plan_end_date)}</td>
                <td>{formatValue(h.jt_plan_qty)}</td>
                <td>{formatValue(h.jt_unit)}</td>
                <td>{formatValue(h.jt_plan_progress)}</td>
                <td>{formatValue(h.jt_actual_start_date)}</td>
                <td>{formatValue(h.jt_actual_end_date)}</td>
                <td>{formatValue(h.jt_actual_value)}</td>
                <td>{formatValue(h.jt_actual_progress)}</td>
                
                {/* Test Commisioning */}
                <td>{formatValue(h.tc_plan_start_date)}</td>
                <td>{formatValue(h.tc_plan_end_date)}</td>
                <td>{formatValue(h.tc_plan_qty)}</td>
                <td>{formatValue(h.tc_unit)}</td>
                <td>{formatValue(h.tc_plan_progress)}</td>
                <td>{formatValue(h.tc_actual_start_date)}</td>
                <td>{formatValue(h.tc_actual_end_date)}</td>
                <td>{formatValue(h.tc_actual_value)}</td>
                <td>{formatValue(h.tc_actual_progress)}</td>
                
                {/* BAUT */}
                <td>{formatValue(h.baut_plan_start_date)}</td>
                <td>{formatValue(h.baut_plan_end_date)}</td>
                <td>{formatValue(h.baut_plan_qty)}</td>
                <td>{formatValue(h.baut_unit)}</td>
                <td>{formatValue(h.baut_plan_progress)}</td>
                <td>{formatValue(h.baut_actual_start_date)}</td>
                <td>{formatValue(h.baut_actual_end_date)}</td>
                <td>{formatValue(h.baut_actual_value)}</td>
                <td>{formatValue(h.baut_actual_progress)}</td>
                
                {/* BAUT 1 */}
                <td>{formatValue(h.baut1_plan_start_date)}</td>
                <td>{formatValue(h.baut1_plan_end_date)}</td>
                <td>{formatValue(h.baut1_plan_qty)}</td>
                <td>{formatValue(h.baut1_unit)}</td>
                <td>{formatValue(h.baut1_plan_progress)}</td>
                <td>{formatValue(h.baut1_actual_start_date)}</td>
                <td>{formatValue(h.baut1_actual_end_date)}</td>
                <td>{formatValue(h.baut1_actual_value)}</td>
                <td>{formatValue(h.baut1_actual_progress)}</td>
                
                {/* BAST */}
                <td>{formatValue(h.bast_plan_start_date)}</td>
                <td>{formatValue(h.bast_plan_end_date)}</td>
                <td>{formatValue(h.bast_plan_qty)}</td>
                <td>{formatValue(h.bast_unit)}</td>
                <td>{formatValue(h.bast_plan_progress)}</td>
                <td>{formatValue(h.bast_actual_start_date)}</td>
                <td>{formatValue(h.bast_actual_end_date)}</td>
                <td>{formatValue(h.bast_actual_value)}</td>
                <td>{formatValue(h.bast_actual_progress)}</td>
                
                {/* Final Fields */}
                <td>{formatValue(h.current_position)}</td>
                <td>{formatValue(h.bast_total_idr)}</td>
                <td>{formatValue(h.remaining_po)}</td>
                <td>{formatValue(h.final_rekon_amount_idr)}</td>
                <td>{formatValue(h.final_rekon_reason)}</td>
                <td>{formatValue(h.remaining_final)}</td>
                <td>{formatValue(h.invoice_idr)}</td>
                <td>{formatValue(h.status_project)}</td>
                
                {/* Action Column */}
                <td className="action-cell">
                  <div className="action-buttons">
                    <button onClick={() => onView(h)} title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(h)} title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(getHierarchyId(h.id))} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
