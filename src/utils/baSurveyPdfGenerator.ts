import jsPDF from 'jspdf';
import { BASurveyResponse, baSurveyService } from '@/services/baSurveyService';
import { API_CONFIG } from '@/config/api';

/**
 * Helper to fetch image from URL and convert to Base64
 */
const fetchImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw error;
  }
};

/**
 * Helper function to extract ID from dynamic database ID object/string
 */
const extractId = (thing: any): string => {
  if (!thing) return 'unknown';
  if (typeof thing === 'string') return thing;
  if (typeof thing.id === 'string') return thing.id;
  if (thing.id?.String) return thing.id.String;
  return 'unknown';
};

/**
 * Helper to load signature (from argument, backend documents, or localStorage fallback)
 */
const loadSignature = async (
  baSurvey: BASurveyResponse,
  userType: 'user1' | 'user2',
  providedSignature?: string
): Promise<string | undefined> => {
  if (providedSignature && providedSignature.trim() !== '') {
    return providedSignature;
  }

  const isApproved = userType === 'user1' ? baSurvey.approved_by_user1 : baSurvey.approved_by_user2;
  if (!isApproved) {
    return undefined;
  }

  const baSurveyId = typeof baSurvey.id === 'string'
    ? baSurvey.id
    : (typeof baSurvey.id?.id === 'string' ? baSurvey.id.id : baSurvey.id?.id?.String || 'unknown');

  const label = userType === 'user1' ? 'Tanda Tangan MITRA' : 'Tanda Tangan TELKOM WASPANG';
  const doc = baSurvey.documents?.find(d => d.keterangan === label);

  if (doc) {
    try {
      const fileUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${doc.file_path.replace('uploads/', '')}`;
      console.log(`🔍 loadSignature: fetching ${userType} signature from backend:`, fileUrl);
      return await fetchImageAsBase64(fileUrl);
    } catch (err) {
      console.error(`Failed to load ${userType} signature from backend, falling back to localStorage:`, err);
    }
  }

  // Fallback to localStorage
  const sig = localStorage.getItem(`ba_survey_sig_${userType}_${baSurveyId}`);
  return sig || undefined;
};

/**
 * Helper function to convert number to Indonesian words
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
 * Generate default content for BA Survey
 */
const generateDefaultContent = (baSurvey: BASurveyResponse): string[] => {
  const surveyDate = new Date(baSurvey.tanggal_ba);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[surveyDate.getDay()];
  const dayNumber = surveyDate.getDate();
  const dayWord = numberToIndonesianWords(dayNumber);
  const monthName = monthNames[surveyDate.getMonth()];
  const year = surveyDate.getFullYear();
  const yearWord = numberToIndonesianWords(year);

  const contractDate = new Date(baSurvey.tanggal_kontrak);
  const contractDateStr = `${contractDate.getDate()} ${monthNames[contractDate.getMonth()]} ${contractDate.getFullYear()}`;

  return [
    `Berdasarkan hasil pelaksanaan survey lapangan yang dilaksanakan pada hari ${dayName} tanggal ${dayWord} bulan ${monthName} tahun ${yearWord} (${dayNumber}-${monthName}-${year}) oleh Waspang TELKOM terhadap ${baSurvey.nama_proyek}, yang dilaksanakan oleh ${baSurvey.pelaksana} terkait dengan Kontrak Nomor ${baSurvey.nomor_kontrak}, tanggal ${contractDateStr}.`,
    'Survey Lapangan telah dilakukan, hasil survey akan dievaluasi dan dituangkan dalam Berita Acara Design Review Meeting.',
    'Hal-hal yang masih perlu disempurnakan yang berkaitan dengan pelaksanaan survey akan diselesaikan dengan segera dalam masa pelaksanaan.'
  ];
};

/**
 * Helper to draw the Telkom & Telkom Infra logo header on the evidence page
 */
const drawEvidenceHeader = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  telkomLogoBase64?: string,
  telkomInfraBase64?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Draw Telkom Indonesia Logo (Left)
  if (telkomLogoBase64) {
    try {
      doc.addImage(telkomLogoBase64, 'PNG', 15, 10, 13, 13);
    } catch (err) {
      console.error('Failed to draw Telkom logo image, fallback to vector:', err);
      drawTelkomVector(doc);
    }
  } else {
    drawTelkomVector(doc);
  }

  // 2. Draw Telkom Infra Logo (Right)
  const infraLogoWidth = 32;
  const infraLogoHeight = 10;
  const rightLogoX = pageWidth - 15 - infraLogoWidth;
  if (telkomInfraBase64) {
    try {
      doc.addImage(telkomInfraBase64, 'PNG', rightLogoX, 11.5, infraLogoWidth, infraLogoHeight);
    } catch (err) {
      console.error('Failed to draw Telkom Infra logo image, fallback to vector:', err);
      drawTelkomInfraVector(doc, pageWidth - 45);
    }
  } else {
    drawTelkomInfraVector(doc, pageWidth - 45);
  }

  // 3. Draw Title (Center)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, pageWidth / 2, 24, { align: 'center' });

  // 4. Draw Header line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, 27, pageWidth - 15, 27);
};

// Helper for Telkom Vector Fallback
const drawTelkomVector = (doc: jsPDF) => {
  doc.setFillColor(219, 17, 39); // Telkom Red color
  doc.ellipse(20, 20, 3, 3, 'F'); // Stylized logo circle
  doc.setFillColor(255, 255, 255);
  doc.ellipse(19, 19, 1, 1, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Telkom', 25, 19);
  doc.setFont('helvetica', 'normal');
  doc.text('Indonesia', 25, 22);
};

// Helper for Telkom Infra Vector Fallback
const drawTelkomInfraVector = (doc: jsPDF, rightLogoX: number) => {
  doc.setFillColor(219, 17, 39); // Telkom Red
  doc.rect(rightLogoX, 17, 2, 6, 'F');
  doc.setFillColor(120, 120, 120); // Grey bar
  doc.rect(rightLogoX + 3, 17, 1.5, 6, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Telkom', rightLogoX + 6, 19);
  doc.setTextColor(219, 17, 39);
  doc.text('infra', rightLogoX + 6, 22);
};

/**
 * Append survey evidence photos page in a 2x2 grid format
 */
const appendEvidencePhotosPage = async (doc: jsPDF, baSurvey: BASurveyResponse, photos: any[]) => {
  const cellWidth = 87;
  const cellHeight = 105;
  const colGap = 6;
  const rowGap = 5;
  const chunkSize = 4;

  // Pre-load official logo images from public folder
  let telkomLogo: string | undefined;
  let telkomInfra: string | undefined;

  try {
    telkomLogo = await fetchImageAsBase64('/telkom-logo.png');
  } catch (err) {
    console.error('Failed to load official Telkom logo, using vector fallback:', err);
  }

  try {
    telkomInfra = await fetchImageAsBase64('/logo-telkominfra.png');
  } catch (err) {
    console.error('Failed to load official Telkom Infra logo, using vector fallback:', err);
  }

  for (let i = 0; i < photos.length; i += chunkSize) {
    const chunk = photos.slice(i, i + chunkSize);

    // Add new page
    doc.addPage();

    // Draw Header
    const projectName = baSurvey.nama_proyek || 'PENGADAAN DAN PEMASANGAN OSP FO BACKBONE & RMJ';
    drawEvidenceHeader(doc, 'FOTO KEGIATAN SURVEY', projectName, telkomLogo, telkomInfra);

    // Draw 2x2 grid for this chunk
    for (let j = 0; j < chunk.length; j++) {
      const photo = chunk[j];

      // Calculate grid positions
      const col = j % 2;
      const row = Math.floor(j / 2);

      const x = 15 + col * (cellWidth + colGap);
      const y = 32 + row * (cellHeight + rowGap);

      // Draw outer cell border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(x, y, cellWidth, cellHeight);

      // Draw image inside cell
      const imgWidth = cellWidth - 2;
      const imgHeight = cellHeight - 12; // Leave 12mm for caption
      const imgX = x + 1;
      const imgY = y + 1;

      let imgBase64: string | undefined;
      if (photo.file_path) {
        try {
          const fileUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${photo.file_path.replace('uploads/', '')}`;
          console.log(`📸 Loading photo ${i + j + 1} from URL:`, fileUrl);
          imgBase64 = await fetchImageAsBase64(fileUrl);
        } catch (err) {
          console.error('Failed to load evidence photo:', err);
        }
      }

      if (imgBase64) {
        try {
          // Detect format
          let format = 'JPEG';
          if (photo.file_type && photo.file_type.toLowerCase().includes('png')) {
            format = 'PNG';
          }
          doc.addImage(imgBase64, format, imgX, imgY, imgWidth, imgHeight);
        } catch (err) {
          console.error('Failed to add image to PDF:', err);
          // Draw error placeholder
          doc.setFillColor(240, 240, 240);
          doc.rect(imgX, imgY, imgWidth, imgHeight, 'F');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('Gagal memuat gambar', imgX + imgWidth / 2, imgY + imgHeight / 2, { align: 'center' });
        }
      } else {
        // Draw empty placeholder
        doc.setFillColor(245, 245, 245);
        doc.rect(imgX, imgY, imgWidth, imgHeight, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Foto tidak tersedia', imgX + imgWidth / 2, imgY + imgHeight / 2, { align: 'center' });
      }

      // Draw caption/text underneath the image
      const textY = y + cellHeight - 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);

      // Caption: use keterangan or file_name
      const caption = photo.keterangan || photo.file_name || `Foto Bukti ${i + j + 1}`;
      const wrappedCaption = doc.splitTextToSize(caption, cellWidth - 4);

      if (wrappedCaption.length > 0) {
        doc.text(wrappedCaption[0], x + cellWidth / 2, textY, { align: 'center' });
      }

      // Show secondary small detail (like index/timestamp) if space allows
      if (photo.created_at) {
        const dateStr = new Date(photo.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        doc.text(dateStr, x + cellWidth / 2, textY + 4, { align: 'center' });
      }
    }
  }
};

/**
 * Generate BA Survey PDF
 * Format sesuai dengan template Berita Acara Survey
 */
export const generateBASurveyPDF = async (baSurvey: BASurveyResponse) => {
  // Create new PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Pre-load official logo images from public folder
  let telkomLogo: string | undefined;
  let telkomInfra: string | undefined;

  try {
    telkomLogo = await fetchImageAsBase64('/telkom-logo.png');
  } catch (err) {
    console.error('Failed to load official Telkom logo:', err);
  }

  try {
    telkomInfra = await fetchImageAsBase64('/logo-telkominfra.png');
  } catch (err) {
    console.error('Failed to load official Telkom Infra logo:', err);
  }

  // Draw Header on Page 1
  drawEvidenceHeader(doc, '', '', telkomLogo, telkomInfra);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BERITA ACARA', pageWidth / 2, 40, { align: 'center' });
  doc.text('SURVEY', pageWidth / 2, 48, { align: 'center' });

  // Project Details Section
  let yPosition = 70;
  const labelWidth = 60;
  const colonPosition = margin + labelWidth;
  const valuePosition = colonPosition + 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Nama Proyek
  doc.text('Nama Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nama_proyek, valuePosition, yPosition);
  yPosition += 6;

  // Nomor Kontrak
  doc.text('Nomor Kontrak', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nomor_kontrak, valuePosition, yPosition);
  yPosition += 6;

  // No. BA Survey Ke-
  doc.text('No. BA Survey Ke-', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_ba_drm, valuePosition, yPosition);
  yPosition += 6;

  // No. Amandemen Ke-
  doc.text('No. Amandemen Ke-', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_amandemen, valuePosition, yPosition);
  yPosition += 6;

  // Pelaksana / Mitra Kerja
  doc.text('Pelaksana / Mitra Kerja', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.pelaksana, valuePosition, yPosition);
  yPosition += 6;

  // Lokasi Proyek
  doc.text('Lokasi Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.lokasi, valuePosition, yPosition);
  yPosition += 10;

  // Content Section (numbered list)
  const contentLines = baSurvey.content
    ? baSurvey.content.split('\n').filter(line => line.trim())
    : generateDefaultContent(baSurvey);

  contentLines.forEach((line) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
      yPosition = 35;
    }

    // Wrap long text
    const maxWidth = contentWidth;
    const wrappedText = doc.splitTextToSize(line, maxWidth);

    wrappedText.forEach((textLine: string) => {
      doc.text(textLine, margin, yPosition);
      yPosition += 5;
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
        yPosition = 35;
      }
    });

    yPosition += 2; // Spacing between paragraphs
  });

  yPosition += 10;

  // QR Code placeholder and signature section
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
    yPosition = 35;
  }

  // QR Code removed by request
  yPosition += 10;

  // Signature labels
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const leftSignatureX = margin + 30;
  const rightSignatureX = pageWidth - margin - 50;

  doc.text('MITRA', leftSignatureX, yPosition, { align: 'center' });
  doc.text('TELKOM', rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('WASPANG', rightSignatureX, yPosition, { align: 'center' });

  yPosition += 25;

  // Signature lines
  doc.setFont('helvetica', 'normal');
  doc.line(leftSignatureX - 25, yPosition, leftSignatureX + 25, yPosition);
  doc.line(rightSignatureX - 25, yPosition, rightSignatureX + 25, yPosition);

  yPosition += 5;

  // Names and NIK
  doc.setFontSize(9);
  const name1 = baSurvey.approved_by_user1_name || 'ABDI NUGROHO';
  const name2 = baSurvey.approved_by_user2_name || 'ACHMAD RIFANDI';
  const jab1 = baSurvey.approved_by_user1_jabatan || 'PELAKSANA HARIAN';
  const jab2 = baSurvey.approved_by_user2_jabatan || 'NIK. 940462';

  doc.text(name1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(name2, rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(jab1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(jab2, rightSignatureX, yPosition, { align: 'center' });

  // Fetch and append evidence photos (with dummy fallback if empty)
  let photos: any[] = [];
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    photos = await baSurveyService.getBASurveyEvidences(extractId(baSurvey.id), extractId(baSurvey.project_id), token) || [];
  } catch (err) {
    console.error('Failed to fetch evidence photos:', err);
  }

  if (!photos || photos.length === 0) {
    photos = [
      { keterangan: 'Foto Kegiatan Survey 1', file_name: 'foto_survey_1.jpg' },
      { keterangan: 'Foto Kegiatan Survey 2', file_name: 'foto_survey_2.jpg' },
      { keterangan: 'Foto Kegiatan Survey 3', file_name: 'foto_survey_3.jpg' },
      { keterangan: 'Foto Kegiatan Survey 4', file_name: 'foto_survey_4.jpg' }
    ];
  }
  await appendEvidencePhotosPage(doc, baSurvey, photos);

  // Generate filename
  const projectName = baSurvey.nama_proyek.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Berita_Acara_Survey_${projectName}.pdf`;

  // Save PDF
  doc.save(filename);
};

/**
 * Generate BA Survey PDF with QR Code
 * This version includes actual QR code generation and signature images
 */
export const generateBASurveyPDFWithQR = async (
  baSurvey: BASurveyResponse,
  signatureUser1?: string,
  signatureUser2?: string
) => {

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Pre-load official logo images from public folder
  let telkomLogo: string | undefined;
  let telkomInfra: string | undefined;

  try {
    telkomLogo = await fetchImageAsBase64('/telkom-logo.png');
  } catch (err) {
    console.error('Failed to load official Telkom logo:', err);
  }

  try {
    telkomInfra = await fetchImageAsBase64('/logo-telkominfra.png');
  } catch (err) {
    console.error('Failed to load official Telkom Infra logo:', err);
  }

  // Draw Header on Page 1
  drawEvidenceHeader(doc, '', '', telkomLogo, telkomInfra);

  // Helper functions
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BERITA ACARA', pageWidth / 2, 40, { align: 'center' });
  doc.text('SURVEY', pageWidth / 2, 48, { align: 'center' });

  // Project Details Section
  let yPosition = 70;
  const labelWidth = 60;
  const colonPosition = margin + labelWidth;
  const valuePosition = colonPosition + 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Nama Proyek
  doc.text('Nama Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nama_proyek, valuePosition, yPosition);
  yPosition += 6;

  // Nomor Kontrak
  doc.text('Nomor Kontrak', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nomor_kontrak, valuePosition, yPosition);
  yPosition += 6;

  // No. BA DRM Ke-*
  doc.text('No. BA DRM Ke-*', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_ba_drm, valuePosition, yPosition);
  yPosition += 6;

  // No. Amandemen Ke-*
  doc.text('No. Amandemen Ke-*', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_amandemen, valuePosition, yPosition);
  yPosition += 6;

  // Pelaksana / Mitra Kerja
  doc.text('Pelaksana / Mitra Kerja', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.pelaksana, valuePosition, yPosition);
  yPosition += 6;

  // Lokasi Proyek
  doc.text('Lokasi Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.lokasi, valuePosition, yPosition);
  yPosition += 10;

  // Content Section (numbered list)
  const contentLines = baSurvey.content
    ? baSurvey.content.split('\n').filter(line => line.trim())
    : generateDefaultContent(baSurvey);

  contentLines.forEach((line) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
      yPosition = 35;
    }

    // Wrap long text
    const maxWidth = contentWidth;
    const wrappedText = doc.splitTextToSize(line, maxWidth);

    wrappedText.forEach((textLine: string) => {
      doc.text(textLine, margin, yPosition);
      yPosition += 5;
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
        yPosition = 35;
      }
    });

    yPosition += 2; // Spacing between paragraphs
  });

  yPosition += 10;

  // QR Code and signature section
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
    yPosition = 35;
  }

  // QR Code removed by request
  yPosition += 10;

  // Signature labels
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const leftSignatureX = margin + 30;
  const rightSignatureX = pageWidth - margin - 50;

  doc.text('MITRA', leftSignatureX, yPosition, { align: 'center' });
  doc.text('TELKOM', rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('WASPANG', rightSignatureX, yPosition, { align: 'center' });

  yPosition += 5;

  // Load signatures
  const sig1 = await loadSignature(baSurvey, 'user1', signatureUser1);
  const sig2 = await loadSignature(baSurvey, 'user2', signatureUser2);

  const signatureHeight = 20;
  const signatureWidth = 40;

  if (sig1) {
    try {
      doc.addImage(
        sig1,
        'PNG',
        leftSignatureX - signatureWidth / 2,
        yPosition,
        signatureWidth,
        signatureHeight
      );
      console.log('✅ Added MITRA signature to PDF (With QR)');
    } catch (error) {
      console.error('❌ Failed to add MITRA signature:', error);
    }
  }

  if (sig2) {
    try {
      doc.addImage(
        sig2,
        'PNG',
        rightSignatureX - signatureWidth / 2,
        yPosition,
        signatureWidth,
        signatureHeight
      );
      console.log('✅ Added WASPANG signature to PDF (With QR)');
    } catch (error) {
      console.error('❌ Failed to add WASPANG signature:', error);
    }
  }

  yPosition += signatureHeight;

  // Signature lines
  doc.setFont('helvetica', 'normal');
  doc.line(leftSignatureX - 25, yPosition, leftSignatureX + 25, yPosition);
  doc.line(rightSignatureX - 25, yPosition, rightSignatureX + 25, yPosition);

  yPosition += 5;

  // Names and NIK
  doc.setFontSize(9);
  const name1 = baSurvey.approved_by_user1_name || 'ABDI NUGROHO';
  const name2 = baSurvey.approved_by_user2_name || 'ACHMAD RIFANDI';
  const jab1 = baSurvey.approved_by_user1_jabatan || 'PELAKSANA HARIAN';
  const jab2 = baSurvey.approved_by_user2_jabatan || 'NIK. 940462';

  doc.text(name1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(name2, rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(jab1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(jab2, rightSignatureX, yPosition, { align: 'center' });

  // Fetch and append evidence photos (with dummy fallback if empty)
  let photos: any[] = [];
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    photos = await baSurveyService.getBASurveyEvidences(extractId(baSurvey.id), extractId(baSurvey.project_id), token) || [];
  } catch (err) {
    console.error('Failed to fetch evidence photos:', err);
  }

  if (!photos || photos.length === 0) {
    photos = [
      { keterangan: 'Foto Kegiatan Survey 1', file_name: 'foto_survey_1.jpg' },
      { keterangan: 'Foto Kegiatan Survey 2', file_name: 'foto_survey_2.jpg' },
      { keterangan: 'Foto Kegiatan Survey 3', file_name: 'foto_survey_3.jpg' },
      { keterangan: 'Foto Kegiatan Survey 4', file_name: 'foto_survey_4.jpg' }
    ];
  }
  await appendEvidencePhotosPage(doc, baSurvey, photos);

  // Generate filename
  const projectName = baSurvey.nama_proyek.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Berita_Acara_Survey_${projectName}.pdf`;

  // Save PDF
  doc.save(filename);
};

/**
 * Generate BA Survey PDF Blob for preview (without downloading)
 * Returns a Blob that can be used to create an object URL for iframe preview
 */
export const generateBASurveyPDFBlob = async (
  baSurvey: BASurveyResponse,
  signatureUser1?: string,
  signatureUser2?: string
): Promise<Blob> => {

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Pre-load official logo images from public folder
  let telkomLogo: string | undefined;
  let telkomInfra: string | undefined;

  try {
    telkomLogo = await fetchImageAsBase64('/telkom-logo.png');
  } catch (err) {
    console.error('Failed to load official Telkom logo:', err);
  }

  try {
    telkomInfra = await fetchImageAsBase64('/logo-telkominfra.png');
  } catch (err) {
    console.error('Failed to load official Telkom Infra logo:', err);
  }

  // Draw Header on Page 1
  drawEvidenceHeader(doc, '', '', telkomLogo, telkomInfra);

  // Load signatures
  const sig1 = await loadSignature(baSurvey, 'user1', signatureUser1);
  const sig2 = await loadSignature(baSurvey, 'user2', signatureUser2);

  const baSurveyId = typeof baSurvey.id === 'string'
    ? baSurvey.id
    : (typeof baSurvey.id?.id === 'string' ? baSurvey.id.id : baSurvey.id?.id?.String || 'unknown');

  console.log('📄 Generating PDF with signatures:', {
    baSurveyId,
    hasUser1Signature: !!sig1,
    hasUser2Signature: !!sig2
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BERITA ACARA', pageWidth / 2, 40, { align: 'center' });
  doc.text('SURVEY', pageWidth / 2, 48, { align: 'center' });

  // Project Details Section
  let yPosition = 70;
  const labelWidth = 60;
  const colonPosition = margin + labelWidth;
  const valuePosition = colonPosition + 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Nama Proyek
  doc.text('Nama Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nama_proyek, valuePosition, yPosition);
  yPosition += 6;

  // Nomor Kontrak
  doc.text('Nomor Kontrak', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.nomor_kontrak, valuePosition, yPosition);
  yPosition += 6;

  // No. BA Survey Ke-
  doc.text('No. BA Survey Ke-', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_ba_drm, valuePosition, yPosition);
  yPosition += 6;

  // No. Amandemen Ke-
  doc.text('No. Amandemen Ke-', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.no_amandemen, valuePosition, yPosition);
  yPosition += 6;

  // Pelaksana / Mitra Kerja
  doc.text('Pelaksana / Mitra Kerja', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.pelaksana, valuePosition, yPosition);
  yPosition += 6;

  // Lokasi Proyek
  doc.text('Lokasi Proyek', margin, yPosition);
  doc.text(':', colonPosition, yPosition);
  doc.text(baSurvey.lokasi, valuePosition, yPosition);
  yPosition += 10;

  // Content Section (numbered list)
  const contentLines = baSurvey.content
    ? baSurvey.content.split('\n').filter(line => line.trim())
    : generateDefaultContent(baSurvey);

  contentLines.forEach((line) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
      yPosition = 35;
    }

    // Wrap long text
    const maxWidth = contentWidth;
    const wrappedText = doc.splitTextToSize(line, maxWidth);

    wrappedText.forEach((textLine: string) => {
      doc.text(textLine, margin, yPosition);
      yPosition += 5;
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
        yPosition = 35;
      }
    });

    yPosition += 2; // Spacing between paragraphs
  });

  yPosition += 10;

  // Signature section
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    drawEvidenceHeader(doc, 'BERITA ACARA SURVEY', baSurvey.nama_proyek, telkomLogo, telkomInfra);
    yPosition = 35;
  }

  yPosition += 10;

  // Signature labels
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const leftSignatureX = margin + 30;
  const rightSignatureX = pageWidth - margin - 50;

  doc.text('MITRA', leftSignatureX, yPosition, { align: 'center' });
  doc.text('TELKOM', rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('WASPANG', rightSignatureX, yPosition, { align: 'center' });

  yPosition += 5;

  // ✅ Add signature images if available
  const signatureHeight = 20;
  const signatureWidth = 40;

  if (sig1) {
    try {
      doc.addImage(
        sig1,
        'PNG',
        leftSignatureX - signatureWidth / 2,
        yPosition,
        signatureWidth,
        signatureHeight
      );
      console.log('✅ Added MITRA signature to PDF');
    } catch (error) {
      console.error('❌ Failed to add MITRA signature:', error);
    }
  }

  if (sig2) {
    try {
      doc.addImage(
        sig2,
        'PNG',
        rightSignatureX - signatureWidth / 2,
        yPosition,
        signatureWidth,
        signatureHeight
      );
      console.log('✅ Added WASPANG signature to PDF');
    } catch (error) {
      console.error('❌ Failed to add WASPANG signature:', error);
    }
  }

  yPosition += signatureHeight;

  // Signature lines
  doc.setFont('helvetica', 'normal');
  doc.line(leftSignatureX - 25, yPosition, leftSignatureX + 25, yPosition);
  doc.line(rightSignatureX - 25, yPosition, rightSignatureX + 25, yPosition);

  yPosition += 5;

  // Names and NIK
  doc.setFontSize(9);
  const name1 = baSurvey.approved_by_user1_name || 'ABDI NUGROHO';
  const name2 = baSurvey.approved_by_user2_name || 'ACHMAD RIFANDI';
  const jab1 = baSurvey.approved_by_user1_jabatan || 'PELAKSANA HARIAN';
  const jab2 = baSurvey.approved_by_user2_jabatan || 'NIK. 940462';

  doc.text(name1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(name2, rightSignatureX, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(jab1, leftSignatureX, yPosition, { align: 'center' });
  doc.text(jab2, rightSignatureX, yPosition, { align: 'center' });

  // Fetch and append evidence photos (with dummy fallback if empty)
  let photos: any[] = [];
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    photos = await baSurveyService.getBASurveyEvidences(extractId(baSurvey.id), extractId(baSurvey.project_id), token) || [];
  } catch (err) {
    console.error('Failed to fetch evidence photos:', err);
  }

  if (!photos || photos.length === 0) {
    photos = [
      { keterangan: 'Foto Kegiatan Survey 1', file_name: 'foto_survey_1.jpg' },
      { keterangan: 'Foto Kegiatan Survey 2', file_name: 'foto_survey_2.jpg' },
      { keterangan: 'Foto Kegiatan Survey 3', file_name: 'foto_survey_3.jpg' },
      { keterangan: 'Foto Kegiatan Survey 4', file_name: 'foto_survey_4.jpg' }
    ];
  }
  await appendEvidencePhotosPage(doc, baSurvey, photos);

  // Return PDF as Blob instead of downloading
  return doc.output('blob');
};
