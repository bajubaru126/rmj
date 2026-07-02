import ExcelJS from 'exceljs';
import { BOQItem } from '@/types/contract';

export const parseExcelBOQ = async (file: File): Promise<BOQItem[]> => {
  try {
    console.log('📄 Parsing Excel file:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    // Convert worksheet to array of arrays
    const excelData: any[][] = [];
    worksheet.eachRow((row) => {
      const rowValues: any[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber - 1] = cell.value;
      });
      excelData.push(rowValues);
    });

    console.log('📊 Total rows in Excel:', excelData.length);

    // Map Excel data to BOQ items
    const boqData = mapExcelToBOQDetails(excelData);
    
    if (boqData.length === 0) {
      throw new Error('No BOQ data found in the Excel file. Please check the file format.');
    }
    
    console.log(`✅ Loaded ${boqData.length} BOQ items`);
    return boqData;
  } catch (error) {
    console.error('Error parsing Excel:', error);
    throw error;
  }
};

const mapExcelToBOQDetails = (excelData: any[]): BOQItem[] => {
  if (!excelData || excelData.length <= 1) return [];

  console.log('📊 Processing Excel data, total rows:', excelData.length);

  const unitOptions = ['meter', 'pcs', 'unit', 'set', 'core', 'ls', 'lsnd'];

  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, excelData.length); i++) {
    const row = excelData[i];
    if (!Array.isArray(row)) continue;
    
    const rowStr = row.map(cell => String(cell || '').trim().toUpperCase()).join('|');
    if (rowStr.includes('DESIGNATOR') || rowStr.includes('URAIAN PEKERJAAN')) {
      headerRowIndex = i;
      console.log('📍 Found header row at index:', i);
      break;
    }
  }

  const startSearchIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  console.log('🔍 Starting data search from row:', startSearchIndex);

  const designatorPattern = /^[A-Z0-9]+-[A-Z0-9-.,\s()]+$/i;
  const boqItems: BOQItem[] = [];
  let rowIndex = 0;

  for (let i = startSearchIndex; i < excelData.length; i++) {
    const row = excelData[i];
    
    if (!Array.isArray(row) || row.every(cell => cell === undefined || cell === null || cell === '')) {
      continue;
    }

    const no = row[0];
    const designator = row[1];
    const uraian = row[2];
    const satuan = row[3];
    const material = row[4];
    const jasa = row[5];
    const drm = row[6];
    const actual = row[7];
    const tambah = row[8];
    const kurang = row[9];
    
    const designatorStr = String(designator || '').trim();
    const uraianStr = String(uraian || '').trim();
    const noStr = String(no || '').trim();
    const satuanStr = String(satuan || '').trim().toLowerCase();

    // Skip header rows
    const rowStrUpper = [noStr, designatorStr, uraianStr].join('|').toUpperCase();
    if (rowStrUpper.includes('DESIGNATOR') || rowStrUpper.includes('URAIAN PEKERJAAN') || rowStrUpper.includes('SATUAN')) {
      continue;
    }

    // Skip section headers
    if (noStr.length === 1 && isNaN(Number(noStr)) && !designatorStr) {
      continue;
    }

    if (!designatorStr && !uraianStr) {
      continue;
    }

    if (!designatorStr && uraianStr && !satuanStr && !material && !jasa && !drm) {
      continue;
    }

    const hasValidDesignator = designatorStr && designatorPattern.test(designatorStr);
    
    if (!hasValidDesignator) {
      continue;
    }

    if (!uraianStr && (material || jasa || drm)) {
      continue;
    }

    let unit = 'meter';
    if (satuanStr) {
      if (unitOptions.includes(satuanStr)) {
        unit = satuanStr;
      } else if (satuanStr === 'pcs' || satuanStr === 'unit') {
        unit = 'pcs';
      } else {
        const uraianLower = uraianStr.toLowerCase();
        if (uraianLower.includes('meter') || uraianLower.includes('kabel')) {
          unit = 'meter';
        } else if (uraianLower.includes('pcs') || uraianLower.includes('unit') || uraianLower.includes('buah')) {
          unit = 'pcs';
        } else if (uraianLower.includes('core')) {
          unit = 'core';
        }
      }
    }

    const parseNumber = (value: any): string => {
      if (value === undefined || value === null || value === '') return '0';
      const str = String(value).replace(/[^0-9.-]/g, '');
      return str || '0';
    };

    rowIndex++;

    const boqItem: BOQItem = {
      id: String(rowIndex),
      designator: designatorStr,
      uraianPekerjaan: uraianStr,
      satuan: unit,
      material: parseNumber(material),
      jasa: parseNumber(jasa),
      drm: parseNumber(drm),
      actual: parseNumber(actual),
      tambah: parseNumber(tambah),
      kurang: parseNumber(kurang),
    };

    boqItems.push(boqItem);
  }

  console.log(`📦 Total BOQ items extracted: ${boqItems.length}`);
  return boqItems;
};
