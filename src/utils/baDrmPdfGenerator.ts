import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BADrmResponse } from '@/services/baDrmService';

/**
 * Helper: convert a number to Indonesian words
 */
const numberToIndonesianWords = (num: number): string => {
  const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
  const teens = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
    'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

  if (num === 0) return 'Nol';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredWord = hundred === 1 ? 'Seratus' : ones[hundred] + ' Ratus';
    return hundredWord + (rest > 0 ? ' ' + numberToIndonesianWords(rest) : '');
  }
  if (num < 10000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandWord = thousand === 1 ? 'Seribu' : ones[thousand] + ' Ribu';
    return thousandWord + (rest > 0 ? ' ' + numberToIndonesianWords(rest) : '');
  }
  return num.toString();
};

/**
 * Helper: format date string to "DD Bulan YYYY"
 */
const formatDateIndo = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(dateStr);
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Helper: extract ID string from Thing object
 */
const extractId = (thing: any): string => {
  if (typeof thing === 'string') return thing;
  if (typeof thing.id === 'string') return thing.id;
  return thing.id.String;
};

/**
 * Generate content paragraphs matching PM sample exactly.
 * Uses embedded metadata fields from BADrmResponse directly.
 */
const generateDrmParagraphs = (baDrm: BADrmResponse): string[] => {
  const drmDate = new Date(baDrm.tanggal);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[drmDate.getDay()];
  const dayNumber = drmDate.getDate();
  const dayWord = numberToIndonesianWords(dayNumber);
  const monthName = monthNames[drmDate.getMonth()];
  const year = drmDate.getFullYear();
  const yearWord = numberToIndonesianWords(year);

  const namaProyek = baDrm.nama_proyek || 'Proyek Telekomunikasi';
  const pelaksana = baDrm.pelaksana || 'Mitra Kerja';
  const nomorKontrak = baDrm.nomor_kontrak || '-';
  const contractDateStr = formatDateIndo(baDrm.tanggal_kontrak);

  return [
    // Paragraph 1 - matches PM sample: uses pihak "............"
    `Berdasarkan hasil pelaksanaan Design Review Meeting yang dilaksanakan pada hari ${dayName} tanggal ${dayWord} bulan ${monthName} tahun ${yearWord} (${dayNumber}-${monthName}-${year}) oleh pihak "............" terhadap ${namaProyek}, yang dilaksanakan oleh ${pelaksana} terkait dengan Kontrak Nomor ${nomorKontrak}, tanggal ${contractDateStr}.`,
    // Paragraph 2 - matches PM sample: "dan hasilnya akan dituangkan"
    'Design Review Meeting telah dilakukan dan hasilnya akan dituangkan dalam Berita Acara Design Review Meeting.',
    // Paragraph 3 is intentionally REMOVED per PM sample
  ];
};

/**
 * Generate BA DRM PDF Blob for preview (without downloading).
 * Returns a Blob that can be used to create an object URL for iframe preview.
 *
 * NOTE: BASurveyResponse is no longer needed — all metadata is embedded in BADrmResponse.
 */
export const generateBADrmPDFBlob = async (
  baDrm: BADrmResponse,
  signatureUser1?: string,
  signatureUser2?: string
): Promise<Blob> => {

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Load signatures from localStorage if not provided
  const baDrmId = extractId(baDrm.id);
  if (!signatureUser1) {
    signatureUser1 = localStorage.getItem(`ba_drm_sig_user1_${baDrmId}`) || undefined;
  }
  if (!signatureUser2) {
    signatureUser2 = localStorage.getItem(`ba_drm_sig_user2_${baDrmId}`) || undefined;
  }

  console.log('📄 Generating BA DRM PDF with embedded metadata:', {
    baDrmId,
    namaProyek: baDrm.nama_proyek,
    hasUser1Signature: !!signatureUser1,
    hasUser2Signature: !!signatureUser2
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BERITA ACARA', pageWidth / 2, 35, { align: 'center' });
  doc.text('DESIGN REVIEW MEETING', pageWidth / 2, 43, { align: 'center' });

  // ── Metadata Table (Bordered Grid - matches PM sample) ─────────────────────
  const noBADrmValue = baDrm.no_ba_drm ? `Ke-${baDrm.no_ba_drm}` : 'Ke-1';
  const noAmandemenValue = baDrm.no_amandemen ? `Ke-${baDrm.no_amandemen}` : 'Ke-1';

  const tableBody = [
    ['Nama Proyek', baDrm.nama_proyek || '-'],
    ['Nomor Kontrak', baDrm.nomor_kontrak || '-'],
    ['No. BA DRM', noBADrmValue],
    ['No. Amandemen', noAmandemenValue],
    ['Pelaksana / Mitra Kerja', baDrm.pelaksana || '-'],
    ['Lokasi DRM', baDrm.lokasi || '-'],
    ['Tanggal DRM', formatDateIndo(baDrm.tanggal)],
  ];

  autoTable(doc, {
    startY: 55,
    head: [],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: pageWidth - margin * 2 - 60 },
    },
    margin: { left: margin, right: margin },
  });

  let yPosition = (doc as any).lastAutoTable.finalY + 10;

  // ── Content Paragraphs ─────────────────────────────────────────────────────
  const paragraphs = generateDrmParagraphs(baDrm);
  const contentWidth = pageWidth - margin * 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  paragraphs.forEach((para, idx) => {
    if (yPosition > pageHeight - 70) {
      doc.addPage();
      yPosition = 25;
    }

    const numberLabel = `${idx + 1}.`;
    doc.text(numberLabel, margin, yPosition);

    const wrappedLines = doc.splitTextToSize(para, contentWidth - 10);
    wrappedLines.forEach((line: string, lineIdx: number) => {
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, margin + 8, yPosition);
      yPosition += 5.5;
    });

    yPosition += 3;
  });

  yPosition += 8;

  yPosition += 10;

  // ── Signature Section ─────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const leftCenterX = margin + 30;
  const rightCenterX = pageWidth - margin - 30;

  doc.text('MITRA', leftCenterX, yPosition, { align: 'center' });
  doc.text('WASPANG', rightCenterX, yPosition, { align: 'center' });
  yPosition += 6;

  // Signature images area
  const sigHeight = 22;
  const sigWidth = 45;

  if (signatureUser1) {
    try {
      doc.addImage(signatureUser1, 'PNG', leftCenterX - sigWidth / 2, yPosition, sigWidth, sigHeight);
    } catch (e) {
      console.error('Failed to add MITRA signature:', e);
    }
  }

  if (signatureUser2) {
    try {
      doc.addImage(signatureUser2, 'PNG', rightCenterX - sigWidth / 2, yPosition, sigWidth, sigHeight);
    } catch (e) {
      console.error('Failed to add WASPANG signature:', e);
    }
  }

  yPosition += sigHeight;

  // Signature lines
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.4);
  doc.line(leftCenterX - 28, yPosition, leftCenterX + 28, yPosition);
  doc.line(rightCenterX - 28, yPosition, rightCenterX + 28, yPosition);

  yPosition += 5;

  // Dynamic name / jabatan labels
  doc.setFontSize(9);
  const name1 = baDrm.approved_by_user1_name ? `Nama    : ${baDrm.approved_by_user1_name}` : 'Nama    : ________________________________';
  const name2 = baDrm.approved_by_user2_name ? `Nama    : ${baDrm.approved_by_user2_name}` : 'Nama    : ________________________________';
  doc.text(name1, leftCenterX - 28, yPosition);
  doc.text(name2, rightCenterX - 28, yPosition);
  yPosition += 5;
  const jab1 = baDrm.approved_by_user1_jabatan ? `Jabatan : ${baDrm.approved_by_user1_jabatan}` : 'Jabatan : ________________________________';
  const jab2 = baDrm.approved_by_user2_jabatan ? `Jabatan : ${baDrm.approved_by_user2_jabatan}` : 'Jabatan : ________________________________';
  doc.text(jab1, leftCenterX - 28, yPosition);
  doc.text(jab2, rightCenterX - 28, yPosition);

  return doc.output('blob');
};
