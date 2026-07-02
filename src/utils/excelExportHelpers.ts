import ExcelJS from 'exceljs';
import { toast } from 'sonner';
import { boqService } from '@/services/boqService';
import { redlineService } from '@/services/redlineService';
import { matrixService } from '@/services/matrixService';
import { spanService } from '@/services/spanService';
import { designatorV2Service } from '@/services/designatorV2Service';

// =====================================================================
// HELPER: Convert column index to Excel column letter (A, B, C...)
// =====================================================================
const colIdxToLetter = (idx: number): string => {
  let result = '';
  let n = idx;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
};

// =====================================================================
// 1. EXPORT BOQ TO EXCEL
// =====================================================================
export async function exportBOQToExcel(
  projectData: any,
  linkName: string,
  lokasi: string,
  rowData: any[],
  apiSummary?: any
) {
  try {
    console.log('🚀 Starting professional BOQ Excel export via helper...');
    
    // Filter out summary rows from export data
    const dataRows = rowData.filter(item => !item.isSummaryRow);
    const summaryRows = rowData.filter(item => item.isSummaryRow);
    
    if (dataRows.length === 0) {
      toast.error('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BOQ Data');

    // Add header information (rows 1-6)
    worksheet.addRow(['BILL OF QUANTITY']);
    worksheet.addRow([projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ']);
    worksheet.addRow(['No.Kontrak', '', `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}`]);
    worksheet.addRow(['SS / LINK', '', `: ${lokasi}`]);
    worksheet.addRow(['Lokasi', '', `: ${projectData?.location || '-'}`]);
    worksheet.addRow(['Pelaksana', '', `: ${projectData?.pelaksana || '-'}`]);
    
    const setHeaderCell = (row: number, col: number, value: string, bold = true, size = 12) => {
      const cell = worksheet.getCell(row, col);
      cell.value = value;
      cell.font = { name: 'Calibri', bold, size };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    };
    
    setHeaderCell(1, 1, 'BILL OF QUANTITY', true, 14);
    worksheet.getRow(1).height = 20;
    
    setHeaderCell(2, 1, projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ', true, 12);
    worksheet.getRow(2).height = 18;
    
    const infoRows = [
      { row: 3, label: 'No.Kontrak', value: `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}` },
      { row: 4, label: 'SS / LINK', value: `: ${lokasi}` },
      { row: 5, label: 'Lokasi', value: `: ${projectData?.location || '-'}` },
      { row: 6, label: 'Pelaksana', value: `: ${projectData?.pelaksana || '-'}` }
    ];
    
    infoRows.forEach(({ row, label, value }) => {
      setHeaderCell(row, 1, label, true, 11);
      setHeaderCell(row, 3, value, true, 11);
      worksheet.getRow(row).height = 18;
    });
    
    worksheet.addRow([]);
    worksheet.getRow(7).height = 15;

    // Add main header row (row 8)
    const headerRow = [
      'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN', 
      'HARGA SATUAN', '', 
      `${lokasi}`, '', '', ''
    ];
    worksheet.addRow(headerRow);

    // Add sub-header row (row 9)
    const subHeaderRow = [
      'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN',
      'Material', 'Jasa', 'DRM', 'ACTUAL', 'TAMBAH', 'KURANG'
    ];
    worksheet.addRow(subHeaderRow);

    // Add data rows (starting from row 10)
    dataRows.forEach((item, index) => {
      const row = [
        index + 1,
        item.designator || '',
        item.uraianPekerjaan || item.uraian_pekerjaan || '',
        item.satuan || '',
        Number(item.hargaSatuanMaterial || item.harga_satuan_material || item.material) || 0,
        Number(item.hargaSatuanJasa || item.harga_satuan_jasa || item.jasa) || 0,
        Number(item.drm) || 0,
        Number(item.actual || item.planned || item.actual) || 0,
        Number(item.tambah) || 0,
        Number(item.kurang) || 0
      ];
      worksheet.addRow(row);
    });

    // Add summary rows
    summaryRows.forEach(summaryRow => {
      const row = [
        '',
        summaryRow.designator,
        '',
        '',
        Number(summaryRow.hargaSatuanMaterial || summaryRow.harga_satuan_material || summaryRow.material) || '',
        Number(summaryRow.hargaSatuanJasa || summaryRow.harga_satuan_jasa || summaryRow.jasa) || '',
        Number(summaryRow.drm) || '',
        Number(summaryRow.actual || summaryRow.planned || summaryRow.aktual) || '',
        Number(summaryRow.tambah) || '',
        Number(summaryRow.kurang) || ''
      ];
      worksheet.addRow(row);
    });

    // Column widths
    worksheet.columns = [
      { width: 6 },   // NO
      { width: 18 },  // DESIGNATOR
      { width: 45 },  // URAIAN PEKERJAAN
      { width: 10 },  // SATUAN
      { width: 12 },  // Material
      { width: 12 },  // Jasa
      { width: 10 },  // DRM
      { width: 10 },  // ACTUAL
      { width: 10 },  // TAMBAH
      { width: 10 }   // KURANG
    ];

    // Style main header (row 8)
    const mainHeaderRow8 = worksheet.getRow(8);
    mainHeaderRow8.height = 25;
    mainHeaderRow8.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
      if (colNumber >= 7 && colNumber <= 10) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // Style sub header (row 9)
    const subHeaderRow9 = worksheet.getRow(9);
    subHeaderRow9.height = 25;
    subHeaderRow9.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // Style data rows
    const dataStartRow = 10;
    const dataEndRow = dataStartRow + dataRows.length - 1;
    for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        let alignment: any = { horizontal: 'center', vertical: 'middle' };
        if (colNumber === 3) {
          alignment = { horizontal: 'left', vertical: 'middle' };
        }
        cell.font = { size: 10 };
        cell.alignment = alignment;
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    }

    // Style summary rows
    const summaryStartRow = dataEndRow + 1;
    const summaryEndRow = summaryStartRow + summaryRows.length - 1;
    for (let rowNum = summaryStartRow; rowNum <= summaryEndRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      row.height = 22;
      const summaryRowData = summaryRows[rowNum - summaryStartRow];
      const isTotalRow = summaryRowData?.isTotalRow;
      
      worksheet.mergeCells(rowNum, 1, rowNum, 2);
      
      const firstCell = row.getCell(1);
      firstCell.value = summaryRowData?.designator || '';
      firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
      firstCell.font = { 
        bold: true, 
        color: { argb: isTotalRow ? 'FFFFFFFF' : 'FF000000' },
        size: 10
      };
      firstCell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' }
      };
      
      row.eachCell((cell, colNumber) => {
        if (colNumber <= 2) {
          cell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          return;
        }
        
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { 
          bold: true, 
          color: { argb: isTotalRow ? 'FFFFFFFF' : 'FF000000' },
          size: 10
        };
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    }

    try {
      worksheet.mergeCells(8, 1, 9, 1); // NO
      worksheet.mergeCells(8, 2, 9, 2); // DESIGNATOR  
      worksheet.mergeCells(8, 3, 9, 3); // URAIAN PEKERJAAN
      worksheet.mergeCells(8, 4, 9, 4); // SATUAN
      worksheet.mergeCells(8, 5, 8, 6); // HARGA SATUAN
      worksheet.mergeCells(8, 7, 8, 10); // SS/LINK header (locations)
    } catch (mergeError) {
      console.warn('⚠️ Could not merge header cells:', mergeError);
    }

    worksheet.views = [{
      state: 'frozen',
      xSplit: 0,
      ySplit: 7,
      topLeftCell: 'A8'
    }];

    const projectName = projectData?.name || 'Project';
    const linkPart = linkName ? `-${linkName}` : '';
    const datePart = new Date().toISOString().split('T')[0];
    const fileName = `BOQ-${projectName}${linkPart}-${datePart}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('BOQ Excel exported successfully');
    console.log('✅ BOQ Excel exported successfully:', fileName);
  } catch (error) {
    console.error('❌ Error exporting BOQ Excel:', error);
    toast.error(`Failed to export BOQ Excel file`);
  }
}

// =====================================================================
// 2. EXPORT MATRIX TO EXCEL
// =====================================================================
export async function exportMatrixToExcel(
  projectData: any,
  linkName: string,
  contractName: string,
  contractId: string,
  allMatrixData: any[],
  designatorColumns: any[],
  dynamicColumns: any[]
) {
  try {
    console.log('🚀 Starting Matrix Excel export via helper...');
    
    const dataRows = allMatrixData.filter(item => 
      !item.isRekapHeader && !item.isRekapSubTotal && 
      !item.isRekapGrandTotal && !item.isRekapGrandTotalRounded
    );
    const summaryRows = allMatrixData.filter(item => 
      item.isRekapSubTotal || item.isRekapGrandTotal || item.isRekapGrandTotalRounded
    );
    
    if (dataRows.length === 0) {
      toast.error('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Matrix Data');
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.dyDescent = 0.35;

    // Info header (rows 1-6)
    worksheet.addRow(['MATRIX DATA']);
    worksheet.addRow([projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ']);
    worksheet.addRow(['No.Kontrak', '', `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}`]);
    worksheet.addRow(['SS / LINK', '', `: ${linkName || contractName}`]);
    worksheet.addRow(['Lokasi', '', `: ${projectData?.location || '-'}`]);
    worksheet.addRow(['Pelaksana', '', `: ${projectData?.pelaksana || '-'}`]);
    
    const setHeaderCell = (row: number, col: number, value: string, bold = true, size = 12) => {
      const cell = worksheet.getCell(row, col);
      cell.value = value;
      cell.font = { name: 'Calibri', bold, size };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    };
    
    setHeaderCell(1, 1, 'MATRIX DATA', true, 14);
    worksheet.getRow(1).height = 20;
    setHeaderCell(2, 1, projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ', true, 12);
    worksheet.getRow(2).height = 18;
    
    const infoRows = [
      { row: 3, label: 'No.Kontrak', value: `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}` },
      { row: 4, label: 'SS / LINK', value: `: ${linkName || contractName}` },
      { row: 5, label: 'Lokasi', value: `: ${projectData?.location || '-'}` },
      { row: 6, label: 'Pelaksana', value: `: ${projectData?.pelaksana || '-'}` }
    ];
    infoRows.forEach(({ row, label, value }) => {
      setHeaderCell(row, 1, label, true, 11);
      setHeaderCell(row, 3, value, true, 11);
      worksheet.getRow(row).height = 18;
    });
    
    worksheet.addRow([]);
    worksheet.getRow(7).height = 15;

    const allDesignatorCols = [...designatorColumns, ...dynamicColumns.filter(col => {
      const colId = col.colId as string;
      return !designatorColumns.some(dc => dc.colId === colId);
    })];

    const totalColumnsCount = 5 + allDesignatorCols.length + 2 + 3 + 8;

    // Row 8: Column Numbers
    const columnNumberRow = [];
    for (let i = 1; i <= totalColumnsCount; i++) {
      columnNumberRow.push(i);
    }
    worksheet.addRow(columnNumberRow);

    // Row 9: Group headers
    const headerRow9 = [
      'SPAN', '', '', '', 
      'DESIGNATOR',
      ...allDesignatorCols.map(col => col.headerName || col.colId as string || ''),
      'FO BOQ', '',
      'KEBUTUHAN FO', '', '',
      'JUMLAH POSISI', '', '', '', '', '', '', ''
    ];
    worksheet.addRow(headerRow9);

    // Row 10: Sub-headers
    const headerRow10 = [
      'NO', 'A', 'B', 'LENGTH',
      '',
      ...allDesignatorCols.map(() => ''),
      'SLACK\nBERBAYAR', 'FO TOTAL',
      'SLACK TIDAK\nBERBAYAR', 'TOL 2%', 'PENGADAAN',
      'BM', 'S3', 'DS', 'BSS', 'BTS', 'DA', 'HPS1', 'HPS2'
    ];
    worksheet.addRow(headerRow10);

    // Row 11: Empty spacing row
    worksheet.addRow([]);

    // Group data by spanGroup
    const groupedData: { [key: string]: any[] } = {};
    dataRows.forEach(item => {
      const spanName = item.spanGroup || 'Unknown';
      if (!groupedData[spanName]) {
        groupedData[spanName] = [];
      }
      groupedData[spanName].push(item);
    });

    // Add data rows with span header
    Object.entries(groupedData).forEach(([spanName, items]) => {
      const spanNameRowData = [spanName];
      for (let i = 1; i < totalColumnsCount; i++) {
        spanNameRowData.push('');
      }
      worksheet.addRow(spanNameRowData);
      
      const lastRowNumber = worksheet.lastRow?.number || 12;
      const spanHeaderRow = worksheet.getRow(lastRowNumber);
      spanHeaderRow.height = 25;
      
      worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
      
      const firstCell = spanHeaderRow.getCell(1);
      firstCell.value = spanName;
      firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
      firstCell.font = { bold: true, color: { argb: 'FF000000' }, size: 12 };
      
      for (let col = 1; col <= totalColumnsCount; col++) {
        const cell = spanHeaderRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
          ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
        };
      }
      
      items.forEach((item, index) => {
        const row = [
          item.span || (index + 1),
          item.offset_from || '',
          item.offset_to || '',
          Number(item.length) || '',
          item.designator || '',
        ];
        
        allDesignatorCols.forEach(col => {
          const field = col.colId as string || col.field as string;
          const value = item[field];
          row.push(value === 0 || value === null || value === undefined ? '' : Number(value) || '');
        });
        
        row.push(Number(item.slack_berbayar) || '', Number(item.fo_total) || '');
        row.push(Number(item.slack_tidak_berbayar) || '', Number(item.tol_2_persen) || '', Number(item.pengadaan) || '');
        row.push(
          Number(item.bm) || '', Number(item.s3) || '', Number(item.ds) || '', Number(item.bss) || '',
          Number(item.bts) || '', Number(item.da) || '', Number(item.hps1) || '', Number(item.hps2) || ''
        );
        
        worksheet.addRow(row);
      });
    });

    // Add span sub total rows (under each span) or REKAPITULASI sub totals
    summaryRows
      .filter(row => row.isRekapSubTotal)
      .forEach(summaryRow => {
        const row = [
          '',
          summaryRow.rekapLabel || summaryRow.designator,
          '',
          summaryRow.length !== null && summaryRow.length !== undefined ? (Number(summaryRow.length) || '-') : '-',
          '',
        ];
        
        allDesignatorCols.forEach(col => {
          const field = col.colId as string || col.field as string;
          const value = summaryRow[field];
          row.push(value === null || value === undefined || value === 0 ? '-' : Number(value));
        });
        
        row.push(
          summaryRow.slack_berbayar !== null && summaryRow.slack_berbayar !== undefined && summaryRow.slack_berbayar !== 0 ? Number(summaryRow.slack_berbayar) : '-',
          summaryRow.fo_total !== null && summaryRow.fo_total !== undefined && summaryRow.fo_total !== 0 ? Number(summaryRow.fo_total) : '-'
        );
        row.push(
          summaryRow.slack_tidak_berbayar !== null && summaryRow.slack_tidak_berbayar !== undefined && summaryRow.slack_tidak_berbayar !== 0 ? Number(summaryRow.slack_tidak_berbayar) : '-',
          summaryRow.tol_2_persen !== null && summaryRow.tol_2_persen !== undefined && summaryRow.tol_2_persen !== 0 ? Number(summaryRow.tol_2_persen) : '-',
          summaryRow.pengadaan !== null && summaryRow.pengadaan !== undefined && summaryRow.pengadaan !== 0 ? Number(summaryRow.pengadaan) : '-'
        );
        row.push(
          summaryRow.bm !== null && summaryRow.bm !== undefined && summaryRow.bm !== 0 ? Number(summaryRow.bm) : '-',
          summaryRow.s3 !== null && summaryRow.s3 !== undefined && summaryRow.s3 !== 0 ? Number(summaryRow.s3) : '-',
          summaryRow.ds !== null && summaryRow.ds !== undefined && summaryRow.ds !== 0 ? Number(summaryRow.ds) : '-',
          summaryRow.bss !== null && summaryRow.bss !== undefined && summaryRow.bss !== 0 ? Number(summaryRow.bss) : '-',
          summaryRow.bts !== null && summaryRow.bts !== undefined && summaryRow.bts !== 0 ? Number(summaryRow.bts) : '-',
          summaryRow.da !== null && summaryRow.da !== undefined && summaryRow.da !== 0 ? Number(summaryRow.da) : '-',
          summaryRow.hps1 !== null && summaryRow.hps1 !== undefined && summaryRow.hps1 !== 0 ? Number(summaryRow.hps1) : '-',
          summaryRow.hps2 !== null && summaryRow.hps2 !== undefined && summaryRow.hps2 !== 0 ? Number(summaryRow.hps2) : '-'
        );
        
        worksheet.addRow(row);
        
        const lastRowNumber = worksheet.lastRow?.number || 12;
        const summaryRowObj = worksheet.getRow(lastRowNumber);
        summaryRowObj.height = 25;
        
        worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
        const firstCell = summaryRowObj.getCell(1);
        firstCell.value = summaryRow.rekapLabel || summaryRow.designator;
        firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
        firstCell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
        
        for (let col = 1; col <= totalColumnsCount; col++) {
          const cell = summaryRowObj.getCell(col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
          if (col >= 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: false, color: { argb: 'FF000000' }, size: 10 };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
            ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
          };
        }
      });

    // Add REKAPITULASI section header and Grand Totals
    worksheet.addRow([]); // spacer
    const rekapHeaderRowData = ['REKAPITULASI'];
    for (let i = 1; i < totalColumnsCount; i++) rekapHeaderRowData.push('');
    worksheet.addRow(rekapHeaderRowData);
    
    let lastRowNumber = worksheet.lastRow?.number || 12;
    const rekapHeaderRow = worksheet.getRow(lastRowNumber);
    rekapHeaderRow.height = 25;
    worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 4);
    
    const rekapFirstCell = rekapHeaderRow.getCell(1);
    rekapFirstCell.value = 'REKAPITULASI';
    rekapFirstCell.alignment = { horizontal: 'left', vertical: 'middle' };
    rekapFirstCell.font = { bold: true, size: 12 };
    
    for (let col = 1; col <= totalColumnsCount; col++) {
      const cell = rekapHeaderRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
        ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
      };
    }

    // Add GRAND TOTAL rows under REKAPITULASI
    const mainDesignatorStartCol = 6;
    const mainDesignatorEndCol = 5 + allDesignatorCols.length;
    const mainFoBOQStartCol = mainDesignatorEndCol + 1;
    const mainKebutuhanFOStartCol = mainFoBOQStartCol + 2;
    const mainJumlahPosisiStartCol = mainKebutuhanFOStartCol + 3;

    summaryRows
      .filter(row => row.isRekapGrandTotal || row.isRekapGrandTotalRounded)
      .forEach(summaryRow => {
        const row = [
          summaryRow.rekapLabel || summaryRow.designator,
          '',
          '',
          summaryRow.length !== null && summaryRow.length !== undefined ? (Number(summaryRow.length) || '-') : '-',
          '',
        ];
        
        allDesignatorCols.forEach(col => {
          const field = col.colId as string || col.field as string;
          const value = summaryRow[field];
          row.push(value === null || value === undefined || value === 0 ? '-' : Number(value));
        });
        
        row.push(
          summaryRow.slack_berbayar !== null && summaryRow.slack_berbayar !== undefined && summaryRow.slack_berbayar !== 0 ? Number(summaryRow.slack_berbayar) : '-',
          summaryRow.fo_total !== null && summaryRow.fo_total !== undefined && summaryRow.fo_total !== 0 ? Number(summaryRow.fo_total) : '-',
          summaryRow.slack_tidak_berbayar !== null && summaryRow.slack_tidak_berbayar !== undefined && summaryRow.slack_tidak_berbayar !== 0 ? Number(summaryRow.slack_tidak_berbayar) : '-',
          summaryRow.tol_2_persen !== null && summaryRow.tol_2_persen !== undefined && summaryRow.tol_2_persen !== 0 ? Number(summaryRow.tol_2_persen) : '-',
          summaryRow.pengadaan !== null && summaryRow.pengadaan !== undefined && summaryRow.pengadaan !== 0 ? Number(summaryRow.pengadaan) : '-',
          summaryRow.bm !== null && summaryRow.bm !== undefined && summaryRow.bm !== 0 ? Number(summaryRow.bm) : '-',
          summaryRow.s3 !== null && summaryRow.s3 !== undefined && summaryRow.s3 !== 0 ? Number(summaryRow.s3) : '-',
          summaryRow.ds !== null && summaryRow.ds !== undefined && summaryRow.ds !== 0 ? Number(summaryRow.ds) : '-',
          summaryRow.bss !== null && summaryRow.bss !== undefined && summaryRow.bss !== 0 ? Number(summaryRow.bss) : '-',
          summaryRow.bts !== null && summaryRow.bts !== undefined && summaryRow.bts !== 0 ? Number(summaryRow.bts) : '-',
          summaryRow.da !== null && summaryRow.da !== undefined && summaryRow.da !== 0 ? Number(summaryRow.da) : '-',
          summaryRow.hps1 !== null && summaryRow.hps1 !== undefined && summaryRow.hps1 !== 0 ? Number(summaryRow.hps1) : '-',
          summaryRow.hps2 !== null && summaryRow.hps2 !== undefined && summaryRow.hps2 !== 0 ? Number(summaryRow.hps2) : '-'
        );
        
        worksheet.addRow(row);
        
        const lastRow = worksheet.lastRow?.number || 12;
        const grandTotalRow = worksheet.getRow(lastRow);
        grandTotalRow.height = 22;
        
        worksheet.mergeCells(lastRow, 1, lastRow, 3);
        const cell1 = grandTotalRow.getCell(1);
        cell1.value = summaryRow.rekapLabel || summaryRow.designator;
        cell1.alignment = { horizontal: 'left', vertical: 'middle' };
        cell1.font = { bold: true, size: 10 };
        
        grandTotalRow.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          if (colNumber >= 4) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: true, size: 10 };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            ...(colNumber === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
            ...(colNumber === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
          };
        });
      });

    // Set widths
    const widths = [
      { width: 6 },   // NO
      { width: 12 },  // A
      { width: 12 },  // B
      { width: 12 },  // LENGTH
      { width: 18 },  // DESIGNATOR
    ];
    allDesignatorCols.forEach(() => widths.push({ width: 8 }));
    widths.push({ width: 15 }, { width: 12 });
    widths.push({ width: 18 }, { width: 10 }, { width: 12 });
    for (let i = 0; i < 8; i++) widths.push({ width: 8 });
    worksheet.columns = widths;

    // Merge group headers
    try {
      worksheet.mergeCells(9, 1, 9, 4); // SPAN
      worksheet.mergeCells(9, 5, 10, 5); // DESIGNATOR
      for (let col = mainDesignatorStartCol; col <= mainDesignatorEndCol; col++) {
        worksheet.mergeCells(9, col, 10, col);
      }
      worksheet.mergeCells(9, mainFoBOQStartCol, 9, mainFoBOQStartCol + 1); // FO BOQ
      worksheet.mergeCells(9, mainKebutuhanFOStartCol, 9, mainKebutuhanFOStartCol + 2); // KEBUTUHAN FO
      worksheet.mergeCells(9, mainJumlahPosisiStartCol, 9, mainJumlahPosisiStartCol + 7); // JUMLAH POSISI
    } catch (e) {
      console.error('Merge error:', e);
    }

    // Header styling
    for (let row = 1; row <= 6; row++) {
      const cell = worksheet.getCell(row, 1);
      cell.font = { bold: true, size: row === 1 ? 14 : 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    // Column numbers row (row 8)
    const styleRow8 = worksheet.getRow(8);
    styleRow8.height = 20;
    styleRow8.eachCell((cell) => {
      cell.font = { bold: false, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Group header row (row 9)
    const styleRow9 = worksheet.getRow(9);
    styleRow9.height = 25;
    styleRow9.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10 };
      if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      
      if (colNumber >= 1 && colNumber <= 4) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray
      } else if (colNumber === 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8B8' } }; // Soft red
      } else if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; // Light gray
      } else if (colNumber >= mainFoBOQStartCol && colNumber <= mainFoBOQStartCol + 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Light green
      } else if (colNumber >= mainKebutuhanFOStartCol && colNumber <= mainKebutuhanFOStartCol + 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }; // Light yellow
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Light pink
      }
      
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Sub-header row (row 10)
    const styleRow10 = worksheet.getRow(10);
    styleRow10.height = 30;
    styleRow10.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 9 };
      
      if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
      } else if (colNumber >= mainFoBOQStartCol && colNumber <= totalColumnsCount) {
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: true };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }

      if (colNumber >= 1 && colNumber <= 4) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      } else if (colNumber === 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8B8' } };
      } else if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      } else if (colNumber >= mainFoBOQStartCol && colNumber <= mainFoBOQStartCol + 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else if (colNumber >= mainKebutuhanFOStartCol && colNumber <= mainKebutuhanFOStartCol + 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }
      
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    worksheet.views = [{
      state: 'frozen',
      xSplit: 0,
      ySplit: 11,
      topLeftCell: 'A12'
    }];

    const projectName = projectData?.name || contractId || 'Project';
    const linkPart = linkName ? `-${linkName}` : '';
    const datePart = new Date().toISOString().split('T')[0];
    const fileName = `MATRIX-${projectName}${linkPart}-${datePart}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Matrix Excel exported successfully');
    console.log('✅ Matrix Excel exported successfully:', fileName);
  } catch (error) {
    console.error('❌ Error exporting Matrix Excel:', error);
    toast.error('Failed to export Matrix Excel file');
  }
}

// =====================================================================
// 3. EXPORT REDLINE TO EXCEL
// =====================================================================
export async function exportRedlineToExcel(
  projectData: any,
  linkName: string,
  contractId: string,
  filteredRedlineData: any[]
) {
  try {
    console.log('🚀 Starting Redline Excel export via helper...');
    
    if (!filteredRedlineData || filteredRedlineData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('REDLINE');
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.dyDescent = 0.35;

    const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FF000000' } };

    const DATA_START_COL = 3; // column C
    const maxItems = Math.max(...filteredRedlineData.map((s: any) => s.span_items?.length || 0));

    // Column widths
    worksheet.getColumn(1).width = 35.0; // A
    worksheet.getColumn(2).width = 25.0; // B
    for (let i = 0; i <= maxItems + 2; i++) {
      worksheet.getColumn(colIdxToLetter(DATA_START_COL + i)).width = 14.0;
    }

    const setRowHeight = (r: number, h: number) => {
      const row = worksheet.getRow(r);
      row.height = h;
      (row as any).dyDescent = 0.35;
    };
    setRowHeight(8, 20.0);
    setRowHeight(9, 20.0);

    const setCalibri = (addr: string, val: string, leftAlign = false) => {
      const cell = worksheet.getCell(addr);
      cell.value = val;
      cell.font = { name: 'Calibri', bold: true, size: 12 };
      if (leftAlign) cell.alignment = { horizontal: 'left' };
    };
    const setNarrow = (addr: string, val: string) => {
      const cell = worksheet.getCell(addr);
      cell.value = val;
      cell.font = { name: 'Arial Narrow', bold: true, size: 12 };
      cell.alignment = { vertical: 'middle' };
    };

    setCalibri('A1', 'REDLINE');
    setCalibri('A2', [projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ'].toString());
    setNarrow('A3', 'No.Kontrak');
    setCalibri('C3', `: ${projectData?.no_kontrak || contractId || '-'}`, true);
    setNarrow('A4', 'SS / LINK');
    const ssLinkFirst = filteredRedlineData[0]?.span_name || '-';
    const ssLinkLast  = filteredRedlineData[filteredRedlineData.length - 1]?.span_name || '-';
    const ssLinkValue = filteredRedlineData.length > 1 ? `${ssLinkFirst} - ${ssLinkLast}` : ssLinkFirst;
    setCalibri('C4', `: ${linkName || ssLinkValue}`, true);
    setNarrow('A5', 'Area');
    setCalibri('C5', `: ${projectData?.region || '-'}`, true);
    setNarrow('A6', 'Pelaksana');
    setCalibri('C6', `: ${projectData?.pelaksana || '-'}`, true);

    [1, 2, 3, 4, 5, 6].forEach(r => setRowHeight(r, 20.0));
    setRowHeight(7, 20.0);

    // Sequence headers (row 8)
    for (let i = 0; i < maxItems; i++) {
      const cell = worksheet.getCell(8, DATA_START_COL + i);
      cell.value = i + 1;
      cell.font = { name: 'Calibri', size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'bottom' };
      cell.border = { bottom: { style: 'thick', color: { argb: 'FFFF0000' } } };
    }

    let currentRow = 10;

    filteredRedlineData.forEach((span: any, spanIndex: number) => {
      const items = span.span_items || [];
      const n = items.length;

      const rowCum = currentRow;
      const rowDes = currentRow + 1;
      const rowLen = currentRow + 2;
      const rowBlank = currentRow + 3;

      // Span index label
      const cellSpanLabel = worksheet.getCell(rowCum, 1);
      cellSpanLabel.value = `SPAN ${spanIndex + 1}`;
      cellSpanLabel.font = { name: 'Calibri', bold: true, size: 12 };
      cellSpanLabel.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Route name label
      const nextSpan = filteredRedlineData[spanIndex + 1];
      const startName = span.span_name || `SPAN ${spanIndex + 1}`;
      const routeLabel = nextSpan?.span_name ? `${startName}-${nextSpan.span_name}` : startName;
      const cellRouteName = worksheet.getCell(rowDes, 1);
      cellRouteName.value = routeLabel;
      
      let routeFontSize = 12;
      if (routeLabel.length > 40) routeFontSize = 8;
      else if (routeLabel.length > 30) routeFontSize = 9;
      else if (routeLabel.length > 20) routeFontSize = 10;
      cellRouteName.font = { name: 'Calibri', bold: true, size: routeFontSize };
      cellRouteName.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Start point label (column B)
      const cellB = worksheet.getCell(rowCum, 2);
      const spanName = span.span_name || `SPAN ${spanIndex + 1}`;
      cellB.value = spanName;
      
      let spanFontSize = 12;
      if (spanName.length > 30) spanFontSize = 8;
      else if (spanName.length > 20) spanFontSize = 9;
      else if (spanName.length > 15) spanFontSize = 10;
      cellB.font = { name: 'Calibri', bold: true, size: spanFontSize };
      cellB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      worksheet.mergeCells(rowCum, 2, rowLen, 2);
      cellB.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

      if (n > 0) {
        items.forEach((item: any, idx: number) => {
          const colIdx = DATA_START_COL + idx;
          const itemName = item.item_name || item.designator || '-';
          const itemLen = item.length !== null && item.length !== undefined ? Math.round(item.length) : 0;
          
          const cumCell = worksheet.getCell(rowCum, colIdx);
          cumCell.value = Math.round(item.redline || 0);
          cumCell.font = { name: 'Calibri', size: 12 };
          cumCell.alignment = { horizontal: 'center', vertical: 'middle' };

          const desCell = worksheet.getCell(rowDes, colIdx);
          desCell.value = itemName;
          desCell.font = { name: 'Calibri', size: 12 };
          desCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

          const lenCell = worksheet.getCell(rowLen, colIdx);
          lenCell.value = itemLen;
          lenCell.font = { name: 'Calibri', size: 12 };
          lenCell.alignment = { horizontal: 'center', vertical: 'middle' };

          const isFirst = idx === 0;
          const isLast = idx === n - 1;

          [rowCum, rowDes, rowLen].forEach(r => {
            const c = worksheet.getCell(r, colIdx);
            c.border = {
              top: r === rowCum ? THIN_BORDER : undefined,
              bottom: r === rowLen ? THIN_BORDER : undefined,
              left: isFirst ? THIN_BORDER : THIN_BORDER,
              right: isLast ? THIN_BORDER : THIN_BORDER,
            };
          });
        });

        // Total Column at end
        const totalColIdx = DATA_START_COL + n;
        worksheet.getColumn(totalColIdx).width = 12;
        const totalLen = items.reduce((sum: number, item: any) => sum + (item.length || 0), 0);
        const cellTotal = worksheet.getCell(rowLen, totalColIdx);
        cellTotal.value = Math.round(totalLen);
        cellTotal.font = { name: 'Calibri', size: 12, bold: true };
        cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cellTotal.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
      }

      setRowHeight(rowCum, 30.0);
      setRowHeight(rowDes, 30.0);
      setRowHeight(rowLen, 30.0);
      setRowHeight(rowBlank, 20.0);

      currentRow += 4;
    });

    const projectName = projectData?.name || contractId || 'export';
    const linkPart = linkName ? `_${linkName}` : '';
    const fileName = `Redline_Data_${projectName}${linkPart}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Redline Excel exported successfully');
    console.log('✅ Redline Excel exported successfully');
  } catch (error) {
    console.error('❌ Error exporting Redline Excel:', error);
    toast.error('Failed to export Redline Excel');
  }
}

// =====================================================================
// 4. DOWNLOAD BOQ EXCEL FOR PROJECT (Self-Fetching)
// =====================================================================
export async function downloadBOQExcelForProject(
  projectId: string,
  linkId: string,
  linkName: string,
  projectData: any
) {
  const data = await boqService.getBOQMatrixByProjectId(projectId, linkId);
  const boqItems = data?.items || [];
  const summary = data?.summary;
  await exportBOQToExcel(projectData, linkName, linkName, boqItems, summary);
}

// =====================================================================
// 5. DOWNLOAD REDLINE EXCEL FOR PROJECT (Self-Fetching)
// =====================================================================
export async function downloadRedlineExcelForProject(
  projectId: string,
  linkId: string,
  linkName: string,
  projectData: any
) {
  const data = await redlineService.getRedlineByProject(projectId);
  const spansToFinalize = (data || []).filter((span: any) => {
    const spanLinkId = typeof span.link_id === 'string' ? span.link_id :
                      (span.link_id?.id?.String || span.link_id?.String || '');
    return spanLinkId === linkId;
  });
  await exportRedlineToExcel(projectData, linkName, projectId, spansToFinalize);
}

// =====================================================================
// 6. DOWNLOAD MATRIX EXCEL FOR PROJECT (Self-Fetching)
// =====================================================================
export async function downloadMatrixExcelForProject(
  projectId: string,
  linkId: string,
  linkName: string,
  projectData: any
) {
  // 1. Fetch spans for this link to filter
  const spansForLink = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
  const spanIdsForLink = new Set(
    spansForLink.map(span => {
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
  const response = await matrixService.getMatrixByProjectId(projectId);

  // 3. Fetch designators to build designator columns
  const designators = await designatorV2Service.getAllDesignators();
  const sortedDesignators = designators
    .sort((a: any, b: any) => (a.no || 0) - (b.no || 0))
    .map((d: any) => d.name);

  const designatorColumns = sortedDesignators
    .filter((name: string) => name && typeof name === 'string')
    .map((name: string) => ({
      colId: name,
      field: name,
      headerName: name.toUpperCase(),
    }));

  // 4. Transform data to row format
  const transformedData: any[] = [];
  const allDesignatorFields = new Set<string>();

  response.spans.forEach((span: any) => {
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

    // Filter
    if (!spanIdsForLink.has(spanId)) return;

    span.span_items.forEach((item: any, index: number) => {
      Object.keys(item).forEach(key => {
        const excludedFields = [
          'id', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator',
          'slack_berbayar', 'fo_total', 'slack_tidak_berbayar', 'tol_2_persen', 'pengadaan',
          'bm', 's3', 'ds', 'bss', 'bts', 'da', 'hps1', 'hps2'
        ];
        if (!excludedFields.includes(key)) {
          allDesignatorFields.add(key);
        }
      });

      const row: any = {
        spanGroup: span.span_name,
        span: (index + 1).toString(),
        offset: item.offset !== null && item.offset !== undefined ? item.offset.toString() : '-',
        offset_from: item.offset_from !== null && item.offset_from !== undefined ? item.offset_from.toString() : '-',
        offset_to: item.offset_to !== null && item.offset_to !== undefined ? item.offset_to.toString() : '-',
        length: item.length !== null && item.length !== undefined ? item.length : 0,
        depth: item.depth !== null && item.depth !== undefined ? item.depth.toString() : '-',
        location: item.location || '-',
        designator: item.designator || '-',
        slack_berbayar: item.slack_berbayar || 0,
        fo_total: item.fo_total || 0,
        slack_tidak_berbayar: item.slack_tidak_berbayar || 0,
        tol_2_persen: item.tol_2_persen || 0,
        pengadaan: item.pengadaan || 0,
        bm: item.bm || 0,
        s3: item.s3 || 0,
        ds: item.ds || 0,
        bss: item.bss || 0,
        bts: item.bts || 0,
        da: item.da || 0,
        hps1: item.hps1 || 0,
        hps2: item.hps2 || 0,
      };

      Object.keys(item).forEach(key => {
        if (!row.hasOwnProperty(key)) {
          const val = parseFloat(item[key]);
          row[key] = !isNaN(val) ? val : 0;
        }
      });

      transformedData.push(row);
    });

    // Add span sub total row
    const spanSubTotalRow: any = {
      spanGroup: span.span_name,
      span: '-',
      offset: '-',
      offset_from: '-',
      offset_to: '-',
      length: span.total_length || 0,
      depth: '-',
      location: '-',
      designator: '-',
      isRekapSubTotal: true,
      rekapLabel: `SUB TOTAL SPAN ${span.span_name}`,
      slack_berbayar: span.total_slack_berbayar || 0,
      fo_total: span.total_fo_total || 0,
      slack_tidak_berbayar: span.total_slack_tidak_berbayar || 0,
      tol_2_persen: span.total_tol_2_persen || 0,
      pengadaan: span.total_pengadaan || 0,
      bm: span.total_bm || 0,
      s3: span.total_s3 || 0,
      ds: span.total_ds || 0,
      bss: span.total_bss || 0,
      bts: span.total_bts || 0,
      da: span.total_da || 0,
      hps1: span.total_hps1 || 0,
      hps2: span.total_hps2 || 0,
    };

    designatorColumns.forEach(col => {
      const field = col.field;
      const directValue = span[field];
      const totalValue = span[`total_${field}`];
      spanSubTotalRow[field] = directValue !== null && directValue !== undefined ? directValue : (totalValue !== null && totalValue !== undefined ? totalValue : 0);
    });

    transformedData.push(spanSubTotalRow);
  });

  // Calculate dynamic columns from data
  const dynamicColumns = Array.from(allDesignatorFields)
    .filter(field => !designatorColumns.some(col => col.field === field))
    .map(field => ({
      colId: field,
      field: field,
      headerName: field.toUpperCase()
    }));

  const linkGrandTotal: any = {
    grand_total_length: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.length, 0),
    grand_total_slack_berbayar: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.slack_berbayar, 0),
    grand_total_fo_total: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.fo_total, 0),
    grand_total_slack_tidak_berbayar: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.slack_tidak_berbayar, 0),
    grand_total_tol_2_persen: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.tol_2_persen, 0),
    grand_total_pengadaan: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.pengadaan, 0),
    grand_total_bm: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.bm, 0),
    grand_total_s3: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.s3, 0),
    grand_total_ds: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.ds, 0),
    grand_total_bss: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.bss, 0),
    grand_total_bts: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.bts, 0),
    grand_total_da: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.da, 0),
    grand_total_hps1: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.hps1, 0),
    grand_total_hps2: transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + r.hps2, 0),
  };

  const allColumnsCombined = [...designatorColumns, ...dynamicColumns];
  allColumnsCombined.forEach(col => {
    const field = col.field;
    linkGrandTotal[`grand_total_${field}`] = transformedData.filter(r => r.isRekapSubTotal).reduce((sum, r) => sum + (r[field] || 0), 0);
  });

  const grandTotalRow: any = {
    spanGroup: 'REKAPITULASI',
    span: '-',
    offset: '-',
    offset_from: '-',
    offset_to: '-',
    length: linkGrandTotal.grand_total_length || 0,
    depth: '-',
    location: '-',
    designator: '-',
    isRekapGrandTotal: true,
    rekapLabel: 'GRAND TOTAL',
    slack_berbayar: linkGrandTotal.grand_total_slack_berbayar || 0,
    fo_total: linkGrandTotal.grand_total_fo_total || 0,
    slack_tidak_berbayar: linkGrandTotal.grand_total_slack_tidak_berbayar || 0,
    tol_2_persen: linkGrandTotal.grand_total_tol_2_persen || 0,
    pengadaan: linkGrandTotal.grand_total_pengadaan || 0,
    bm: linkGrandTotal.grand_total_bm || 0,
    s3: linkGrandTotal.grand_total_s3 || 0,
    ds: linkGrandTotal.grand_total_ds || 0,
    bss: linkGrandTotal.grand_total_bss || 0,
    bts: linkGrandTotal.grand_total_bts || 0,
    da: linkGrandTotal.grand_total_da || 0,
    hps1: linkGrandTotal.grand_total_hps1 || 0,
    hps2: linkGrandTotal.grand_total_hps2 || 0,
  };

  allColumnsCombined.forEach(col => {
    const field = col.field;
    grandTotalRow[field] = linkGrandTotal[`grand_total_${field}`] || 0;
  });

  transformedData.push(grandTotalRow);

  const grandTotalRoundedRow: any = {
    spanGroup: 'REKAPITULASI',
    span: '-',
    offset: '-',
    offset_from: '-',
    offset_to: '-',
    length: Math.round(linkGrandTotal.grand_total_length || 0),
    depth: '-',
    location: '-',
    designator: '-',
    isRekapGrandTotalRounded: true,
    rekapLabel: 'GRAND TOTAL - ROUNDED',
    slack_berbayar: Math.round(linkGrandTotal.grand_total_slack_berbayar || 0),
    fo_total: Math.round(linkGrandTotal.grand_total_fo_total || 0),
    slack_tidak_berbayar: Math.round(linkGrandTotal.grand_total_slack_tidak_berbayar || 0),
    tol_2_persen: Math.round(linkGrandTotal.grand_total_tol_2_persen || 0),
    pengadaan: Math.round(linkGrandTotal.grand_total_pengadaan || 0),
    bm: linkGrandTotal.grand_total_bm || 0,
    s3: linkGrandTotal.grand_total_s3 || 0,
    ds: linkGrandTotal.grand_total_ds || 0,
    bss: linkGrandTotal.grand_total_bss || 0,
    bts: linkGrandTotal.grand_total_bts || 0,
    da: linkGrandTotal.grand_total_da || 0,
    hps1: linkGrandTotal.grand_total_hps1 || 0,
    hps2: linkGrandTotal.grand_total_hps2 || 0,
  };

  allColumnsCombined.forEach(col => {
    const field = col.field;
    grandTotalRoundedRow[field] = Math.round(linkGrandTotal[`grand_total_${field}`] || 0);
  });

  transformedData.push(grandTotalRoundedRow);

  await exportMatrixToExcel(
    projectData,
    linkName,
    linkName,
    projectId,
    transformedData,
    designatorColumns,
    dynamicColumns
  );
}
