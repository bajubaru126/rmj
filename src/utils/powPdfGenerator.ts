import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StaticPowItem {
  id: string;
  pekerjaan: string;
  duration: number;
  start_date: string;
  finish_date: string;
  task_type: string;
  level: number;
}

const TASK_TYPE_COLORS: Record<string, [number, number, number]> = {
  rolled_up_progress: [0, 0, 0],         // Black
  task:               [107, 155, 210],   // #6b9bd2 (blue)
  rolled_up_task:     [123, 104, 238],   // #7B68EE (purple)
  progress:           [16, 185, 129],    // #10b981 (green)
  default:            [107, 155, 210],
};

const CHART_START_STR = '2025-10-01';
const CHART_END_STR   = '2026-10-31';

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const CHART_START = parseLocalDate(CHART_START_STR);
const CHART_END   = parseLocalDate(CHART_END_STR);

/**
 * Generate POW PDF with Gantt Chart and Signatures
 */
export const generatePOWPDF = async (
  rows: StaticPowItem[],
  linkName: string,
  managerName?: string,
  managerRole?: string,
  signatureData?: string
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleText = `POW ${linkName.toUpperCase()}`;
  doc.text(titleText, pageWidth / 2, 12, { align: 'center' });

  // Subtitle / Info Box
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Pekerjaan:', margin, 18);
  
  doc.setFont('helvetica', 'bold');
  const jobText = 'Surat Pesanan-1 (SP#1) Pengadaan dan Pemasangan OSP FO Backbone, RMJ & Lastmile K.Tel.003410';
  doc.text(jobText, margin + 16, 18);

  // Define Table Headers
  const quarters = [
    { label: 'Qtr 4, 2025', colSpan: 3 },
    { label: 'Qtr 1, 2026', colSpan: 3 },
    { label: 'Qtr 2, 2026', colSpan: 3 },
    { label: 'Qtr 3, 2026', colSpan: 3 },
    { label: 'Qtr 4, 2026', colSpan: 1 },
  ];

  const months = [
    'Oct', 'Nov', 'Dec',
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep',
    'Oct'
  ];

  const head: any[] = [
    [
      { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240] } },
      { content: 'Pekerjaan', rowSpan: 2, styles: { halign: 'left', valign: 'middle', fillColor: [240, 240, 240] } },
      { content: 'Duration', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240] } },
      { content: 'Start', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240] } },
      { content: 'Finish', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240] } },
      ...quarters.map(q => ({
        content: q.label,
        colSpan: q.colSpan,
        styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240] }
      }))
    ],
    months.map(m => ({
      content: m,
      styles: { halign: 'center', valign: 'middle', fillColor: [248, 248, 248] }
    }))
  ];

  // Helper date formatter
  const formatDateLabel = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${dayName} ${day}/${month}/${year}`;
  };

  // Build Table Body Rows
  const body = rows.map((row, idx) => {
    const indent = row.level === 0 ? '' : row.level === 1 ? '  ' : '    ';
    const label = `${indent}${row.pekerjaan}`;

    return [
      idx + 1,
      label,
      `${row.duration} days`,
      formatDateLabel(row.start_date),
      formatDateLabel(row.finish_date),
      ...months.map(() => '') // Placeholders for Gantt grid columns
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: 22,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      // Month columns (9.8mm each to fit landscape bounds)
      5: { cellWidth: 9.8 },
      6: { cellWidth: 9.8 },
      7: { cellWidth: 9.8 },
      8: { cellWidth: 9.8 },
      9: { cellWidth: 9.8 },
      10: { cellWidth: 9.8 },
      11: { cellWidth: 9.8 },
      12: { cellWidth: 9.8 },
      13: { cellWidth: 9.8 },
      14: { cellWidth: 9.8 },
      15: { cellWidth: 9.8 },
      16: { cellWidth: 9.8 },
      17: { cellWidth: 9.8 },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      if (data.row.section !== 'body') return;
      if (data.column.index < 5) return;

      const monthIdx = data.column.index - 5;
      const rowIdx = data.row.index;
      const rowData = rows[rowIdx];

      // Parse start / finish dates
      const taskStart = parseLocalDate(rowData.start_date);
      const taskFinish = parseLocalDate(rowData.finish_date);

      // Find cell's month time bounds (from Oct 2025 to Oct 2026)
      const cellYear = 2025 + Math.floor((10 + monthIdx - 1) / 12);
      const cellMonth = (10 + monthIdx - 1) % 12; // 0 = Jan, 9 = Oct

      const cellStart = new Date(cellYear, cellMonth, 1);
      const cellEnd = new Date(cellYear, cellMonth + 1, 0, 23, 59, 59);

      // Check overlap
      if (taskStart <= cellEnd && taskFinish >= cellStart) {
        const monthDuration = cellEnd.getTime() - cellStart.getTime();

        let startRatio = 0;
        if (taskStart > cellStart) {
          startRatio = (taskStart.getTime() - cellStart.getTime()) / monthDuration;
        }

        let endRatio = 1;
        if (taskFinish < cellEnd) {
          endRatio = (taskFinish.getTime() - cellStart.getTime()) / monthDuration;
        }

        const cellX = data.cell.x;
        const cellY = data.cell.y;
        const cellW = data.cell.width;
        const cellH = data.cell.height;

        const barX = cellX + startRatio * cellW;
        const barW = Math.max(1, (endRatio - startRatio) * cellW);

        const isSummary = rowData.task_type === 'rolled_up_progress';

        if (isSummary) {
          const barH = 3; // height in mm
          const barY = cellY + (cellH - barH) / 2;
          doc.setFillColor(0, 0, 0);
          // Top horizontal line
          doc.rect(barX, barY, barW, 1.5, 'F');
          // Left bracket
          doc.triangle(barX, barY, barX + 2, barY, barX, barY + barH, 'F');
          // Right bracket
          doc.triangle(barX + barW, barY, barX + barW - 2, barY, barX + barW, barY + barH, 'F');
        } else {
          const barH = 2.5; // height in mm
          const barY = cellY + (cellH - barH) / 2;
          const color = TASK_TYPE_COLORS[rowData.task_type] || TASK_TYPE_COLORS.default;
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(barX, barY, barW, barH, 'F');
        }
      }
    }
  });

  let yPos = (doc as any).lastAutoTable.finalY + 8;

  // Add new page if signature/legend block doesn't fit on current page
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = 15;
  }

  // ── Legend Block (on the right) ──
  const legendX = pageWidth - margin - 120;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('LEGEND', legendX, yPos);
  
  // Draw legend border box
  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  doc.rect(legendX, yPos + 2, 120, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  // Legend items configuration
  const legendItems = [
    { label: 'Rolled Up Progress', type: 'rolled-up-progress', color: TASK_TYPE_COLORS.rolled_up_progress },
    { label: 'Task', type: 'task', color: TASK_TYPE_COLORS.task },
    { label: 'Rolled Up Task', type: 'rolled-up-task', color: TASK_TYPE_COLORS.rolled_up_task },
    { label: 'Progress', type: 'progress', color: TASK_TYPE_COLORS.progress },
  ];

  legendItems.forEach((item, i) => {
    const lx = legendX + 4 + Math.floor(i / 2) * 60;
    const ly = yPos + 6 + (i % 2) * 8;

    if (item.type === 'rolled-up-progress') {
      doc.setFillColor(0, 0, 0);
      doc.rect(lx, ly + 1, 10, 1, 'F');
      doc.triangle(lx, ly + 1, lx + 1.5, ly + 1, lx, ly + 3, 'F');
      doc.triangle(lx + 10, ly + 1, lx + 8.5, ly + 1, lx + 10, ly + 3, 'F');
    } else {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(lx, ly + 1, 10, 2.5, 'F');
    }
    
    doc.text(item.label, lx + 14, ly + 3.2);
  });

  // ── Signature Block (on the left) ──
  const sigX = margin + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const roleText = (managerRole || 'JUNIOR PROJECT MANAGER').toUpperCase();
  doc.text(roleText, sigX, yPos + 4);

  // Signature image if provided
  if (signatureData) {
    try {
      const sigHeight = 15;
      const sigWidth = 35;
      doc.addImage(signatureData, 'PNG', sigX, yPos + 6, sigWidth, sigHeight);
    } catch (e) {
      console.error('Failed to add manager signature:', e);
    }
  }

  // Blank space for physical signing / Name under line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  
  const finalManagerName = managerName || 'DANNY TRIHARTIWANDI';
  doc.text(finalManagerName, sigX, yPos + 24);

  // Save the PDF
  const filename = `POW_${linkName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(filename);
};
