import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BACommissioning } from '@/services/installationService';

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
 * Helper: extract ID string from Thing object or string
 */
const extractId = (thing: any): string => {
  if (!thing) return 'unknown';
  if (typeof thing === 'string') return thing;
  if (typeof thing.id === 'string') return thing.id;
  return thing.id?.String || 'unknown';
};

/**
 * Generate BACT content paragraphs
 */
const generateBactParagraphs = (baComm: BACommissioning): string[] => {
  const baDate = baComm.tanggal_ba ? new Date(baComm.tanggal_ba) : new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[baDate.getDay()];
  const dayNumber = baDate.getDate();
  const dayWord = numberToIndonesianWords(dayNumber);
  const monthName = monthNames[baDate.getMonth()];
  const year = baDate.getFullYear();
  const yearWord = numberToIndonesianWords(year);

  const namaProyek = baComm.nama_proyek || 'Proyek OSP FO Backbone / RMJ';
  const pelaksana = baComm.pelaksana || 'PT. Telekomunikasi Indonesia';
  const nomorKontrak = baComm.nomor_kontrak || '-';
  const contractDateStr = formatDateIndo(baComm.tanggal_kontrak);

  return [
    `Berdasarkan hasil pelaksanaan Uji Commissioning (Commissioning Test) yang dilaksanakan pada hari ${dayName} tanggal ${dayWord} bulan ${monthName} tahun ${yearWord} (${dayNumber}-${monthName}-${year}) oleh pihak "WASPANG TELKOM" bersama dengan "PELAKSANA MITRA" terhadap pekerjaan ${namaProyek}, yang dilaksanakan oleh ${pelaksana} sesuai dengan Kontrak Nomor ${nomorKontrak}, tanggal ${contractDateStr}.`,
    'Uji Commissioning telah selesai dilaksanakan secara lengkap dan menyeluruh. Seluruh kelengkapan 5 dokumen wajib (Evidence CT UT, Fault Locator, Power Meter, Fiber Splicing Loss, dan OTDR) telah diperiksa, diverifikasi, dan dinyatakan memenuhi standar kriteria kelulusan teknis.',
    'Pernyataan kelulusan uji commissioning ini dibuat dengan sebenarnya dan digunakan sebagai lampiran penyerahan hasil pekerjaan (BACT).'
  ];
};

/**
 * Helper to draw Telkom header logo vector
 */
const drawTelkomHeader = (doc: jsPDF, pageWidth: number) => {
  // Telkom Vector Left
  doc.setFillColor(219, 17, 39); // Telkom Red
  doc.ellipse(20, 20, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.ellipse(19, 19, 1, 1, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Telkom', 25, 19);
  doc.setFont('helvetica', 'normal');
  doc.text('Indonesia', 25, 22);

  // Telkom Infra Vector Right
  const rightLogoX = pageWidth - 45;
  doc.setFillColor(219, 17, 39);
  doc.rect(rightLogoX, 17, 2, 6, 'F');
  doc.setFillColor(120, 120, 120);
  doc.rect(rightLogoX + 3, 17, 1.5, 6, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Telkom', rightLogoX + 6, 19);
  doc.setTextColor(219, 17, 39);
  doc.text('infra', rightLogoX + 6, 22);

  // Divider Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, 27, pageWidth - 15, 27);
};

/**
 * Generate BA Commissioning PDF Blob for preview/download
 */
export const generateBACommissioningPDFBlob = async (
  baComm: BACommissioning,
  signatureUser1?: string,
  signatureUser2?: string
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const baCommId = extractId(baComm.id);
  if (!signatureUser1) {
    signatureUser1 = localStorage.getItem(`ba_comm_sig_user1_${baCommId}`) || undefined;
  }
  if (!signatureUser2) {
    signatureUser2 = localStorage.getItem(`ba_comm_sig_user2_${baCommId}`) || undefined;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;

  // ── Header Logos ──────────────────────────────────────────────────────────
  drawTelkomHeader(doc, pageWidth);

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BERITA ACARA', pageWidth / 2, 36, { align: 'center' });
  doc.text('COMMISSIONING TEST (BACT)', pageWidth / 2, 43, { align: 'center' });

  // ── Metadata Table (Bordered Grid) ─────────────────────────────────────────
  const tableBody = [
    ['Nama Proyek', baComm.nama_proyek || '-'],
    ['Nomor Kontrak', baComm.nomor_kontrak || '-'],
    ['Tanggal Kontrak', formatDateIndo(baComm.tanggal_kontrak)],
    ['Nomor BA Commissioning', baComm.no_ba || '-'],
    ['Tanggal BA', formatDateIndo(baComm.tanggal_ba)],
    ['Pelaksana / Mitra Kerja', baComm.pelaksana || '-'],
    ['Lokasi Pengujian', baComm.lokasi || '-'],
  ];

  autoTable(doc, {
    startY: 52,
    head: [],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: pageWidth - margin * 2 - 55 },
    },
    margin: { left: margin, right: margin },
  });

  let yPosition = (doc as any).lastAutoTable.finalY + 10;

  // ── Content Paragraphs ─────────────────────────────────────────────────────
  const paragraphs = generateBactParagraphs(baComm);
  const contentWidth = pageWidth - margin * 2;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');

  paragraphs.forEach((para, idx) => {
    if (yPosition > pageHeight - 65) {
      doc.addPage();
      drawTelkomHeader(doc, pageWidth);
      yPosition = 35;
    }

    const numberLabel = `${idx + 1}.`;
    doc.setFont('helvetica', 'bold');
    doc.text(numberLabel, margin, yPosition);
    doc.setFont('helvetica', 'normal');

    const wrappedLines = doc.splitTextToSize(para, contentWidth - 8);
    wrappedLines.forEach((line: string) => {
      if (yPosition > pageHeight - 65) {
        doc.addPage();
        drawTelkomHeader(doc, pageWidth);
        yPosition = 35;
      }
      doc.text(line, margin + 6, yPosition);
      yPosition += 5.5;
    });

    yPosition += 2.5;
  });

  yPosition += 6;

  // ── Signature Section ─────────────────────────────────────────────────────
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    drawTelkomHeader(doc, pageWidth);
    yPosition = 35;
  }

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');

  const leftCenterX = margin + 30;
  const rightCenterX = pageWidth - margin - 30;

  doc.text('MITRA', leftCenterX, yPosition, { align: 'center' });
  doc.text('WASPANG', rightCenterX, yPosition, { align: 'center' });
  yPosition += 5;

  const sigHeight = 18;
  const sigWidth = 38;

  // Render Mitra signature if provided
  if (signatureUser1) {
    try {
      doc.addImage(signatureUser1, 'PNG', leftCenterX - sigWidth / 2, yPosition, sigWidth, sigHeight);
    } catch (e) {
      console.error('Failed to add MITRA signature:', e);
    }
  }

  // Render Waspang signature if provided
  if (signatureUser2) {
    try {
      doc.addImage(signatureUser2, 'PNG', rightCenterX - sigWidth / 2, yPosition, sigWidth, sigHeight);
    } catch (e) {
      console.error('Failed to add WASPANG signature:', e);
    }
  }

  yPosition += sigHeight + 1;

  // Line dividers for name
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.3);
  doc.line(leftCenterX - 25, yPosition, leftCenterX + 25, yPosition);
  doc.line(rightCenterX - 25, yPosition, rightCenterX + 25, yPosition);

  yPosition += 4.5;

  // Print names and jabatan
  doc.setFontSize(8.5);
  const name1 = baComm.created_by_username ? `Nama    : ${baComm.created_by_username.toUpperCase()}` : 'Nama    : __________________________';
  const name2 = baComm.approved_by_username ? `Nama    : ${baComm.approved_by_username.toUpperCase()}` : 'Nama    : __________________________';
  doc.text(name1, leftCenterX - 25, yPosition);
  doc.text(name2, rightCenterX - 25, yPosition);
  yPosition += 4.5;

  const jab1 = 'Jabatan : Mitra Pelaksana';
  const jab2 = 'Jabatan : Waspang Telkom';
  doc.text(jab1, leftCenterX - 25, yPosition);
  doc.text(jab2, rightCenterX - 25, yPosition);

  return doc.output('blob');
};
