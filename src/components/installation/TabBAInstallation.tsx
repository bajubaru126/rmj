import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText, Download, CheckCircle, Clock, XCircle, Trash2,
  Calendar, HardDrive, Upload, X, RefreshCw, User, MapPin, Loader2,
  Check, FileSpreadsheet, Layers, Edit3, Grid, Signature, AlertTriangle, FileCheck
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthContext';
import { baCommissioningService, installationService, BACommissioning, CommissioningEvidence, installationProjectService } from '../../services/installationService';
import { generateBACommissioningPDFBlob } from '../../utils/baCommissioningPdfGenerator';

interface TabBAInstallationProps {
  projectId: string;
  linkId: string;
  linkName?: string;
}

const CHECKLIST_CATEGORIES = [
  { id: 'evidence_ct_ut', name: 'Evidence CT UT (Uji Terima / Comm. Test)', desc: 'Dokumen Uji Terima / Comm. Test' },
  { id: 'fault_locater', name: 'Fault Locator', desc: 'Dokumen Pengukuran Fault Locator' },
  { id: 'power_meter', name: 'Power Meter', desc: 'Dokumen Pengukuran Power Meter / Splicing Loss' },
  { id: 'fiber_splicing_loss', name: 'Fiber Splicing Loss', desc: 'Dokumen Fiber Splicing Loss' },
  { id: 'otdr', name: 'OTDR', desc: 'Dokumen OTDR (.sor atau .pdf)' }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', Icon: Clock, cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', Icon: CheckCircle, cls: 'text-green-600  bg-green-50  border-green-200' },
  rejected: { label: 'Rejected', Icon: XCircle, cls: 'text-red-600    bg-red-50    border-red-200' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TabBAInstallation({ projectId, linkId, linkName }: TabBAInstallationProps) {
  const { token, user } = useAuth();
  const [instProject, setInstProject] = useState<any | null>(null);

  // Tab states: 'checklist' | 'power-meter' | 'otdr' | 'bact-list'
  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'power-meter' | 'otdr' | 'bact-list'>('checklist');

  // BA Commissioning (BACT) states
  const [bactRecords, setBactRecords] = useState<BACommissioning[]>([]);
  const [loadingBact, setLoadingBact] = useState(false);
  const [showBactModal, setShowBactModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedBact, setSelectedBact] = useState<BACommissioning | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Evidences & Completeness states
  const [completeness, setCompleteness] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [evidences, setEvidences] = useState<CommissioningEvidence[]>([]);
  const [loadingCompleteness, setLoadingCompleteness] = useState(false);

  // File Upload states 
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadKeterangan, setUploadKeterangan] = useState('');

  // BACT Form States (Yellow fillable fields)
  const [formNoBa, setFormNoBa] = useState('');
  const [formTanggalBa, setFormTanggalBa] = useState(new Date().toISOString().split('T')[0]);
  const [formNomorKontrak, setFormNomorKontrak] = useState('');
  const [formTanggalKontrak, setFormTanggalKontrak] = useState('');
  const [formPelaksana, setFormPelaksana] = useState('');
  const [formNamaProyek, setFormNamaProyek] = useState('');
  const [formLokasi, setFormLokasi] = useState(linkName || '');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [submittingBact, setSubmittingBact] = useState(false);

  // Signature Pad Refs
  const signatureMitraRef = useRef<SignatureCanvas>(null);
  const signatureWaspangRef = useRef<SignatureCanvas>(null);

  // Power Meter Splicing Loss States
  const [stoA, setStoA] = useState('');
  const [stoB, setStoB] = useState('');
  const [pInAB, setPInAB] = useState('-6.01');
  const [pInBA, setPInBA] = useState('-10.87');
  const [coreCount, setCoreCount] = useState(12);
  const [powerMeterMeasurements, setPowerMeterMeasurements] = useState<any[]>([]);
  const [stoAPhoto, setStoAPhoto] = useState<File | null>(null);
  const [stoBPhoto, setStoBPhoto] = useState<File | null>(null);
  const [stoAPreview, setStoAPreview] = useState<string>('');
  const [stoBPreview, setStoBPreview] = useState<string>('');

  // OTDR Splicing Loss States
  const [otdrFile, setOtdrFile] = useState<File | null>(null);
  const [jtDistances, setJtDistances] = useState<any[]>([
    { id: 1, name: 'JT 1', distance: '3,835', lossAB: '0.202', lossBA: '0.101', avg: '0.151' },
    { id: 2, name: 'JT 2', distance: '6,968', lossAB: '0.000', lossBA: '0.000', avg: '0.000' },
    { id: 3, name: 'JT 3', distance: '9,198', lossAB: '0.000', lossBA: '0.000', avg: '0.000' },
    { id: 4, name: 'JT 4', distance: '12,172', lossAB: '0.000', lossBA: '0.000', avg: '0.000' },
    { id: 5, name: 'JT 5', distance: '15,711', lossAB: '0.000', lossBA: '0.000', avg: '0.000' }
  ]);
  const [otdrSummary, setOtdrSummary] = useState({
    fiberLength: '19.313 km',
    totalLoss: '4.235 dB',
    attenuation: '0.219 dB/km'
  });

  // Fetch BA Commissionings & completeness
  const fetchData = async () => {
    if (!projectId || !linkId) return;
    try {
      setLoadingBact(true);
      setLoadingCompleteness(true);

      const compRes = await baCommissioningService.checkCompleteness(linkId, token);
      setCompleteness(compRes?.checklist || {});
      setIsComplete(compRes?.is_complete || false);

      const evs = await baCommissioningService.getLinkEvidences(linkId, token);
      setEvidences(evs || []);

      const records = await baCommissioningService.getByLinkId(linkId, token);
      setBactRecords(records || []);

      // Fetch installation project to populate metadata
      try {
        const projects = await installationProjectService.getAll(token);
        const match = projects.find((p: any) => {
          const pLinkId = typeof p.link_id === 'string' ? p.link_id : (p.link_id?.id?.String || p.link_id?.id || '');
          return pLinkId === linkId;
        });
        if (match) {
          setInstProject(match);
        }
      } catch (pErr) {
        console.error('Failed to fetch installation project details', pErr);
      }

    } catch (err) {
      console.error('Failed to fetch BA Commissioning data', err);
    } finally {
      setLoadingBact(false);
      setLoadingCompleteness(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, linkId, token]);

  // Initializing Power Meter Measurements table based on core count
  useEffect(() => {
    const measurements = [];
    const pInABNum = parseFloat(pInAB) || -6.01;
    const pInBANum = parseFloat(pInBA) || -10.87;

    for (let i = 1; i <= coreCount; i++) {
      // Dummy outputs to make the spreadsheet visual by default
      const pOutAB = (pInABNum - (0.1 + Math.random() * 0.4)).toFixed(2);
      const pOutBA = (pInBANum - (0.1 + Math.random() * 0.4)).toFixed(2);

      const lossAB = Math.abs(pInABNum - parseFloat(pOutAB));
      const lossBA = Math.abs(pInBANum - parseFloat(pOutBA));
      const finalValue = ((lossAB + lossBA) / 2).toFixed(2);

      measurements.push({
        coreNo: i,
        pInAB: pInABNum.toFixed(2),
        pOutAB,
        lossAB: lossAB.toFixed(2),
        pInBA: pInBANum.toFixed(2),
        pOutBA,
        lossBA: lossBA.toFixed(2),
        finalValue
      });
    }
    setPowerMeterMeasurements(measurements);
  }, [coreCount, pInAB, pInBA]);

  const handleEvidenceUpload = async () => {
    if (!selectedUploadFile || !uploadingCategory) return;
    try {
      setLoadingCompleteness(true);
      const uploadRes = await installationService.uploadFile(selectedUploadFile, uploadingCategory, token);
      if (!uploadRes.file_path) {
        throw new Error('Upload gagal, path tidak ditemukan.');
      }

      await baCommissioningService.saveLinkEvidence(linkId, {
        project_id: projectId,
        file_path: uploadRes.file_path,
        file_name: uploadRes.file_name,
        file_type: selectedUploadFile.name.split('.').pop()?.toLowerCase() || 'pdf',
        file_size: uploadRes.file_size,
        file_category: uploadingCategory,
        keterangan: uploadKeterangan || `Evidence ${uploadingCategory}`
      }, token);

      setSelectedUploadFile(null);
      setUploadingCategory(null);
      setUploadKeterangan('');
      fetchData();
    } catch (err: any) {
      console.error('Failed to save link evidence:', err);
      alert(err.message || 'Gagal menyimpan evidence.');
    } finally {
      setLoadingCompleteness(false);
    }
  };

  const handleEvidenceDelete = async (evidenceId: string) => {
    if (!window.confirm('Hapus dokumen evidence ini?')) return;
    try {
      setLoadingCompleteness(true);
      await baCommissioningService.deleteLinkEvidence(evidenceId, token);
      fetchData();
    } catch (err) {
      console.error('Failed to delete evidence:', err);
      alert('Gagal menghapus evidence.');
    } finally {
      setLoadingCompleteness(false);
    }
  };

  const handleSubmitBact = async () => {
    if (!formNoBa || !formLokasi || !formPelaksana || !formNamaProyek) {
      alert('Mohon lengkapi seluruh field form wajib BACT.');
      return;
    }

    try {
      setSubmittingBact(true);

      const createdBact = await baCommissioningService.create({
        project_id: projectId,
        link_id: linkId,
        lokasi: formLokasi,
        keterangan: formKeterangan || 'Hasil pengujian Commissioning Test berhasil divalidasi.',
        status: 'pending',
        no_ba: formNoBa,
        tanggal_ba: new Date(formTanggalBa).toISOString(),
        nomor_kontrak: formNomorKontrak,
        tanggal_kontrak: formTanggalKontrak ? new Date(formTanggalKontrak).toISOString() : undefined,
        pelaksana: formPelaksana,
        nama_proyek: formNamaProyek
      }, token);

      // Save Signatures to BACT
      const mitraSig = signatureMitraRef.current?.isEmpty() ? null : signatureMitraRef.current?.getTrimmedCanvas().toDataURL('image/png');
      const waspangSig = signatureWaspangRef.current?.isEmpty() ? null : signatureWaspangRef.current?.getTrimmedCanvas().toDataURL('image/png');

      const cleanId = (idObj: any): string => {
        if (typeof idObj === 'string') return idObj;
        return idObj?.id?.String || idObj?.id || '';
      };

      const bactId = cleanId(createdBact.id || createdBact);
      const storageId = bactId.includes(':') ? bactId.split(':').pop() || bactId : bactId;

      if (mitraSig) {
        localStorage.setItem(`ba_comm_sig_user1_${storageId}`, mitraSig);
      }
      if (waspangSig) {
        localStorage.setItem(`ba_comm_sig_user2_${storageId}`, waspangSig);
      }

      // Generate BACT PDF & Save to BACT Document Table
      const generatedBlob = await generateBACommissioningPDFBlob(createdBact, mitraSig || undefined, waspangSig || undefined);

      // Upload generated PDF file first
      const fileToUpload = new File([generatedBlob], `BACT_${formNoBa.replace(/\//g, '_')}.pdf`, { type: 'application/pdf' });
      const uploadRes = await installationService.uploadFile(fileToUpload, 'ba_commissioning', token);

      if (uploadRes.file_path) {
        await baCommissioningService.saveDocument(storageId, {
          file_path: uploadRes.file_path,
          file_name: uploadRes.file_name,
          file_type: 'pdf',
          file_size: uploadRes.file_size,
          keterangan: 'BA Commissioning Test Generated PDF',
          status: 'approved'
        }, token);
      }

      alert('BA Commissioning Test (BACT) berhasil digenerate dan dikirim!');
      setShowBactModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to submit BACT:', err);
      alert(err?.response?.data?.error || 'Gagal menyimpan BACT.');
    } finally {
      setSubmittingBact(false);
    }
  };

  const handleDownloadBactPdf = async (rec: BACommissioning) => {
    try {
      const cleanId = (idObj: any): string => {
        if (typeof idObj === 'string') return idObj;
        return idObj?.id?.String || idObj?.id || '';
      };
      const storageId = cleanId(rec.id).includes(':') ? cleanId(rec.id).split(':').pop() || cleanId(rec.id) : cleanId(rec.id);

      const user1Sig = localStorage.getItem(`ba_comm_sig_user1_${storageId}`) || undefined;
      const user2Sig = localStorage.getItem(`ba_comm_sig_user2_${storageId}`) || undefined;

      const blob = await generateBACommissioningPDFBlob(rec, user1Sig, user2Sig);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACT_${(rec.no_ba || 'report').replace(/\//g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate BACT PDF:', err);
      alert('Gagal mendownload PDF BACT.');
    }
  };

  const handleApprovalSubmit = async (status: 'approved' | 'rejected') => {
    if (!selectedBact) return;
    if (status === 'rejected' && !rejectionReason) {
      alert('Mohon cantumkan alasan penolakan.');
      return;
    }

    try {
      const cleanId = (idObj: any): string => {
        if (typeof idObj === 'string') return idObj;
        return idObj?.id?.String || idObj?.id || '';
      };
      const storageId = cleanId(selectedBact.id).includes(':') ? cleanId(selectedBact.id).split(':').pop() || cleanId(selectedBact.id) : cleanId(selectedBact.id);

      await baCommissioningService.approveOrReject(storageId, {
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : undefined
      }, token);

      alert(`BACT berhasil di-${status}`);
      setShowApprovalModal(false);
      setRejectionReason('');
      setSelectedBact(null);
      fetchData();
    } catch (err) {
      console.error('Failed to submit BACT approval:', err);
      alert('Gagal memperbarui status BACT.');
    }
  };

  // Generate Excel Splicing Loss Sheet
  const handleExportPowerMeterExcel = () => {
    const wb = XLSX.utils.book_new();

    const titleRows = [
      ["PROVISIONAL TEST & COMMISSIONING SHEET"],
      ["FIBER SPLICING LOSS REPORT"],
      [],
      ["PROJECT", `: ${formNamaProyek || 'Pengadaan & Pemasangan OSP FO Backbone'}`],
      ["LOKASI / LINK", `: ${stoA || 'LOKASI A'} - ${stoB || 'LOKASI B'}`],
      ["CABLE TYPE", ": FO G.655 C / 48 Core"],
      ["TEST EQUIPMENT", ": POWER METER"],
      ["CALIBRATION STO A-B", `: ${pInAB} dBm`],
      ["CALIBRATION STO B-A", `: ${pInBA} dBm`],
      []
    ];

    const tableHeaders = [
      "Core No",
      "Link",
      "P in (dBm)",
      "P out (dBm)",
      "Loss (dB)",
      "Final Value (dB)"
    ];

    const tableData: any[][] = [];
    powerMeterMeasurements.forEach(m => {
      tableData.push([m.coreNo, "A -> B", m.pInAB, m.pOutAB, m.lossAB, m.finalValue]);
      tableData.push(["", "B -> A", m.pInBA, m.pOutBA, m.lossBA, ""]);
    });

    const finalSheetData = [...titleRows, tableHeaders, ...tableData];
    const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

    // Styling column widths
    ws['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Power Meter Loss");
    XLSX.writeFile(wb, `Power_Meter_Loss_Report_${stoA || 'A'}_${stoB || 'B'}.xlsx`);
  };

  // Download ZIP Evidence (calibrations & core screenshots)
  const handleDownloadPowerMeterZip = async () => {
    const zip = new JSZip();
    zip.file("README.txt", `ZIP Evidence untuk pengujian Power Meter Link: ${stoA || 'STO A'} - ${stoB || 'STO B'}.\nBerisi data kalibrasi dan hasil cores.`);

    if (stoAPhoto) {
      zip.file(`kalibrasi_lokasi_${stoA || 'A'}.${stoAPhoto.name.split('.').pop()}`, stoAPhoto);
    }
    if (stoBPhoto) {
      zip.file(`kalibrasi_lokasi_${stoB || 'B'}.${stoBPhoto.name.split('.').pop()}`, stoBPhoto);
    }

    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Evidence_PowerMeter_${stoA || 'A'}_${stoB || 'B'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Helper for backend URL mapping
  const processUrl = (path: string) => {
    if (!path) return '#';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    return path.startsWith('http') ? path : `${baseUrl.replace('/api', '')}/${path}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/10 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Sub-Tabs Selector Header */}
      <div className="px-6 py-4 bg-white/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-500" />
            Modul Commissioning & BACT
          </h3>
          <p className="text-xs text-gray-400">Kelola kelengkapan dokumen pengujian, hitung splicing loss, dan terbitkan Berita Acara.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'checklist' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Checklist Evidence
          </button>
          <button
            onClick={() => setActiveSubTab('power-meter')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'power-meter' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Power Meter Grid
          </button>
          <button
            onClick={() => setActiveSubTab('otdr')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'otdr' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            OTDR Splicing
          </button>
          <button
            onClick={() => setActiveSubTab('bact-list')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'bact-list' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Dokumen BACT ({bactRecords.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50/50">

        {/* SUB TAB 1: CHECKLIST & BACT */}
        {activeSubTab === 'checklist' && (
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Panel - Checklist Evidence */}
            <div className="flex-1 space-y-6">

              {/* Completeness Tracker Panel */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 transition-all shadow-sm ${isComplete
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isComplete ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                  {isComplete ? (
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-sm">Status Kelengkapan Dokumen Commissioning</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {isComplete
                      ? '✓ Seluruh 5 berkas wajib telah berhasil diupload. Anda diperbolehkan merilis Berita Acara.'
                      : '⚠ Mohon unggah kelima file wajib di bawah untuk dapat meng-generate dokumen BACT.'}
                  </p>
                </div>
                <button
                  disabled={!isComplete}
                  onClick={() => {
                    setFormLokasi(linkName || instProject?.link_name || '');
                    setFormPelaksana(instProject?.pelaksana || 'PT. Telekomunikasi Indonesia');
                    setFormNamaProyek(instProject?.project_name || 'RMJ Fiber Optik 2026');
                    setFormNomorKontrak(instProject?.no_kontrak || '');
                    setShowBactModal(true);
                  }}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${isComplete
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                    }`}
                >
                  <Signature className="w-4 h-4" />
                  Rilis & Generate BACT
                </button>
              </div>

              {/* Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CHECKLIST_CATEGORIES.map(cat => {
                  const isUploaded = !!completeness[cat.id];
                  const matchingDoc = evidences.find(e => e.file_category === cat.id);

                  return (
                    <div
                      key={cat.id}
                      className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-violet-200 transition-all flex justify-between items-start gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUploaded ? 'bg-emerald-500' : 'bg-gray-300'
                            }`} />
                          <h4 className="text-xs font-bold text-gray-800 truncate" title={cat.name}>
                            {cat.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{cat.desc}</p>

                        {matchingDoc && (
                          <div className="mt-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center justify-between gap-3 text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                              <span className="font-bold text-gray-700 truncate">{matchingDoc.file_name}</span>
                            </div>
                            <span className="text-gray-400 shrink-0">{formatFileSize(matchingDoc.file_size)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {matchingDoc ? (
                          <>
                            <a
                              href={processUrl(matchingDoc.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-violet-600 transition"
                              title="Download berkas"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleEvidenceDelete(matchingDoc.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition"
                              title="Hapus berkas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadingCategory(cat.id);
                              setSelectedUploadFile(null);
                            }}
                            className="px-3 py-1 bg-violet-50 text-violet-600 text-xs font-bold rounded-lg border border-violet-100 hover:bg-violet-100 transition-all flex items-center gap-1"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Panel - BACT Documents List */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Dokumen BACT ({bactRecords.length})
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">List dokumen yang telah digenerate</p>
                </div>

                {/* List */}
                <div className="max-h-[600px] overflow-y-auto">
                  {loadingBact ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-70">
                      <Loader2 className="w-6 h-6 text-violet-500 animate-spin mb-2" />
                      <p className="text-xs font-medium text-gray-500">Memuat...</p>
                    </div>
                  ) : bactRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-xs font-semibold text-gray-500 text-center">Belum ada dokumen</p>
                      <p className="text-[10px] text-gray-400 text-center mt-1">Generate BACT untuk melihat dokumen di sini</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {bactRecords.map(rec => {
                        const statusCfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
                        const { Icon: StatusIcon } = statusCfg;

                        return (
                          <div
                            key={rec.id}
                            className="p-3 hover:bg-gray-50/50 transition-all group cursor-pointer"
                            onClick={() => handleDownloadBactPdf(rec)}
                          >
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${statusCfg.cls}`}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {statusCfg.label}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadBactPdf(rec);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-violet-100 rounded-lg text-violet-600 transition"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Document Info */}
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-gray-800 truncate" title={rec.no_ba || 'BA Commissioning Test'}>
                                {rec.no_ba || 'BA Commissioning Test'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">{rec.nama_proyek || 'RMJ Project'}</p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(rec.created_at)}
                              </p>
                            </div>

                            {/* Admin Approval Button */}
                            {user?.role === 'admin' && rec.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBact(rec);
                                  setShowApprovalModal(true);
                                }}
                                className="w-full mt-2 px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Review & Approve
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer - View All Button */}
                {bactRecords.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => setActiveSubTab('bact-list')}
                      className="w-full px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Lihat Semua Dokumen
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* SUB TAB 2: POWER METER CALCULATION */}
        {activeSubTab === 'power-meter' && (
          <div className="space-y-6">

            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">STO A</label>
                  <input
                    type="text"
                    value={stoA}
                    onChange={e => setStoA(e.target.value)}
                    placeholder="Contoh: STO Labangka"
                    className="border-b border-gray-200 focus:border-violet-500 outline-none text-xs font-bold text-gray-700 py-0.5 w-36"
                  />
                </div>
                <div className="text-gray-300 font-bold">↔</div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">STO B</label>
                  <input
                    type="text"
                    value={stoB}
                    onChange={e => setStoB(e.target.value)}
                    placeholder="Contoh: TSEL PNJ002"
                    className="border-b border-gray-200 focus:border-violet-500 outline-none text-xs font-bold text-gray-700 py-0.5 w-36"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Calib A→B (dBm)</label>
                  <input
                    type="text"
                    value={pInAB}
                    onChange={e => setPInAB(e.target.value)}
                    className="border-b border-gray-200 focus:border-violet-500 outline-none text-xs font-mono font-bold text-gray-700 py-0.5 w-20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Calib B→A (dBm)</label>
                  <input
                    type="text"
                    value={pInBA}
                    onChange={e => setPInBA(e.target.value)}
                    className="border-b border-gray-200 focus:border-violet-500 outline-none text-xs font-mono font-bold text-gray-700 py-0.5 w-20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Jumlah Core</label>
                  <select
                    value={coreCount}
                    onChange={e => setCoreCount(parseInt(e.target.value))}
                    className="border-b border-gray-200 focus:border-violet-500 outline-none text-xs font-bold text-gray-700 py-0.5 w-20 bg-transparent"
                  >
                    <option value={12}>12 Cores</option>
                    <option value={24}>24 Cores</option>
                    <option value={48}>48 Cores</option>
                    <option value={96}>96 Cores</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculations Grid */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Tabel Perhitungan Splicing Loss (Power Meter)</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPowerMeterExcel}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                  </button>
                  <button
                    disabled={!stoAPhoto && !stoBPhoto}
                    onClick={handleDownloadPowerMeterZip}
                    className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" /> Download ZIP
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-3">Core No</th>
                      <th className="p-3">Link</th>
                      <th className="p-3">P in (dBm) [Kalibrasi]</th>
                      <th className="p-3">P out (dBm) [Measured]</th>
                      <th className="p-3">Loss (dB) [P_in - P_out]</th>
                      <th className="p-3">Final Value (dB) [Avg Loss]</th>
                      <th className="p-3">Spec Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
                    {powerMeterMeasurements.map((m, idx) => (
                      <React.Fragment key={m.coreNo}>
                        <tr className="hover:bg-gray-50/50">
                          <td className="p-3 font-bold text-gray-900 border-r border-gray-50" rowSpan={2}>
                            {m.coreNo}
                          </td>
                          <td className="p-3 text-[10px] font-bold text-violet-600">A → B</td>
                          <td className="p-3 text-gray-500">{m.pInAB}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={m.pOutAB}
                              onChange={e => {
                                const copy = [...powerMeterMeasurements];
                                copy[idx].pOutAB = e.target.value;

                                const pin = parseFloat(m.pInAB) || 0;
                                const pout = parseFloat(e.target.value) || 0;
                                const lossAB = Math.abs(pin - pout);
                                const lossBA = parseFloat(copy[idx].lossBA) || 0;

                                copy[idx].lossAB = lossAB.toFixed(2);
                                copy[idx].finalValue = ((lossAB + lossBA) / 2).toFixed(2);
                                setPowerMeterMeasurements(copy);
                              }}
                              className="border border-gray-200 rounded px-2 py-1 outline-none focus:border-violet-500 font-bold text-gray-700 w-16"
                            />
                          </td>
                          <td className="p-3 font-bold text-red-500">{m.lossAB}</td>
                          <td className="p-3 font-bold text-gray-900 border-l border-gray-50 text-center" rowSpan={2}>
                            {m.finalValue}
                          </td>
                          <td className="p-3 text-gray-400" rowSpan={2}>
                            Max 1.00 dB
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="p-3 text-[10px] font-bold text-blue-600">B → A</td>
                          <td className="p-3 text-gray-500">{m.pInBA}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={m.pOutBA}
                              onChange={e => {
                                const copy = [...powerMeterMeasurements];
                                copy[idx].pOutBA = e.target.value;

                                const pin = parseFloat(m.pInBA) || 0;
                                const pout = parseFloat(e.target.value) || 0;
                                const lossBA = Math.abs(pin - pout);
                                const lossAB = parseFloat(copy[idx].lossAB) || 0;

                                copy[idx].lossBA = lossBA.toFixed(2);
                                copy[idx].finalValue = ((lossAB + lossBA) / 2).toFixed(2);
                                setPowerMeterMeasurements(copy);
                              }}
                              className="border border-gray-200 rounded px-2 py-1 outline-none focus:border-violet-500 font-bold text-gray-700 w-16"
                            />
                          </td>
                          <td className="p-3 font-bold text-red-500">{m.lossBA}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calibrations Pictures Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-800">Bukti Foto Kalibrasi STO A-B</h4>
                <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                  {stoAPreview ? (
                    <div className="relative inline-block">
                      <img src={stoAPreview} className="h-32 object-cover rounded-lg border" alt="Preview A-B" />
                      <button onClick={() => { setStoAPhoto(null); setStoAPreview(''); }} className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => document.getElementById('sto-a-photo')?.click()}>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 font-bold">Upload kalibrasi STO A</span>
                      <input id="sto-a-photo" type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setStoAPhoto(file); setStoAPreview(URL.createObjectURL(file)); }
                      }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-800">Bukti Foto Kalibrasi STO B-A</h4>
                <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                  {stoBPreview ? (
                    <div className="relative inline-block">
                      <img src={stoBPreview} className="h-32 object-cover rounded-lg border" alt="Preview B-A" />
                      <button onClick={() => { setStoBPhoto(null); setStoBPreview(''); }} className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => document.getElementById('sto-b-photo')?.click()}>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 font-bold">Upload kalibrasi STO B</span>
                      <input id="sto-b-photo" type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setStoBPhoto(file); setStoBPreview(URL.createObjectURL(file)); }
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SUB TAB 3: OTDR SPLICING LOSS */}
        {activeSubTab === 'otdr' && (
          <div className="space-y-6">

            {/* OTDR Upload Panel */}
            <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="text-xs font-bold text-gray-800">Unggah File OTDR (.sor / .pdf)</h4>
                <p className="text-[10px] text-gray-400">Pindai jarak Joint Closure (JT) dan nilai redaman kabel.</p>
              </div>

              <div className="flex items-center gap-3">
                {otdrFile ? (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-1.5 text-xs text-violet-700">
                    <FileText className="w-4 h-4 text-violet-600" />
                    <span className="font-bold truncate max-w-[150px]">{otdrFile.name}</span>
                    <button onClick={() => setOtdrFile(null)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input id="otdr-sor-input" type="file" accept=".sor,.pdf" className="hidden" onChange={e => setOtdrFile(e.target.files?.[0] || null)} />
                    <button
                      onClick={() => document.getElementById('otdr-sor-input')?.click()}
                      className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition flex items-center gap-1.5 shadow"
                    >
                      <Upload className="w-3.5 h-3.5" /> Pilih File OTDR
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Summary parameters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Panjang Kabel (OTDR)</span>
                <p className="text-base font-bold text-gray-700 mt-1">{otdrSummary.fiberLength}</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Total Loss</span>
                <p className="text-base font-bold text-gray-700 mt-1">{otdrSummary.totalLoss}</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Redaman Kabel</span>
                <p className="text-base font-bold text-gray-700 mt-1">{otdrSummary.attenuation}</p>
              </div>
            </div>

            {/* JT Splicing Loss Matrix */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Tabel Pemetaan Redaman Joint Tape (Splicing Loss)</span>
                <button
                  onClick={() => alert('Splicing loss report generated!')}
                  className="px-3.5 py-1.5 bg-violet-50 border border-violet-100 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                >
                  Generate Splicing Loss
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-3">Splice JT No</th>
                      <th className="p-3">Distance A to B (km)</th>
                      <th className="p-3">Splice Loss A→B (dB)</th>
                      <th className="p-3">Splice Loss B→A (dB)</th>
                      <th className="p-3">Average Splice Loss (dB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
                    {jtDistances.map((jt, idx) => (
                      <tr key={jt.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold text-gray-900">{jt.name}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={jt.distance}
                            onChange={e => {
                              const copy = [...jtDistances];
                              copy[idx].distance = e.target.value;
                              setJtDistances(copy);
                            }}
                            className="border border-gray-200 rounded px-2 py-1 outline-none text-gray-700 w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={jt.lossAB}
                            onChange={e => {
                              const copy = [...jtDistances];
                              copy[idx].lossAB = e.target.value;
                              const valAB = parseFloat(e.target.value) || 0;
                              const valBA = parseFloat(copy[idx].lossBA) || 0;
                              copy[idx].avg = ((valAB + valBA) / 2).toFixed(3);
                              setJtDistances(copy);
                            }}
                            className="border border-gray-200 rounded px-2 py-1 outline-none text-gray-700 w-20"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={jt.lossBA}
                            onChange={e => {
                              const copy = [...jtDistances];
                              copy[idx].lossBA = e.target.value;
                              const valAB = parseFloat(copy[idx].lossAB) || 0;
                              const valBA = parseFloat(e.target.value) || 0;
                              copy[idx].avg = ((valAB + valBA) / 2).toFixed(3);
                              setJtDistances(copy);
                            }}
                            className="border border-gray-200 rounded px-2 py-1 outline-none text-gray-700 w-20"
                          />
                        </td>
                        <td className="p-3 font-bold text-gray-900">{jt.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* SUB TAB 4: BACT DOKUMEN LIST */}
        {activeSubTab === 'bact-list' && (
          <div className="space-y-4">

            {loadingBact ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-70">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-500">Memuat data BACT...</p>
              </div>
            ) : bactRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex flex-col items-center justify-center mb-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">Belum ada dokumen BACT diterbitkan</p>
                <p className="text-[10px] text-gray-400 mt-1">Selesaikan checklist dokumen untuk menerbitkan BACT pertama.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {bactRecords.map(rec => {
                  const statusCfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
                  const { Icon: StatusIcon } = statusCfg;
                  const doc = rec.documents?.[0];

                  return (
                    <div
                      key={rec.id}
                      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all p-4 flex flex-col gap-3"
                    >
                      {/* Action trigger download */}
                      <button
                        onClick={() => handleDownloadBactPdf(rec)}
                        className="absolute inset-0 rounded-2xl bg-violet-600/0 hover:bg-violet-600/5 transition-all flex items-center justify-center z-10"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 bg-violet-600 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg">
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </div>
                      </button>

                      {/* Top section status */}
                      <div className="flex items-start justify-between relative z-20">
                        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          {user?.role === 'admin' && rec.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBact(rec);
                                setShowApprovalModal(true);
                              }}
                              className="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-[9px] font-bold transition mr-1"
                            >
                              Approve
                            </button>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.cls}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* BACT metadata */}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-800 truncate" title={rec.no_ba || 'BA Commissioning Test'}>
                          {rec.no_ba || 'BA Commissioning Test'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">{rec.nama_proyek || 'RMJ Project'}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{rec.keterangan}</p>
                      </div>

                      {/* Location & signed user info */}
                      <div className="flex flex-col gap-1 text-[10px] text-gray-400 pt-2 border-t border-gray-50 mt-auto">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" /> {rec.lokasi}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> Pelaksana: {rec.pelaksana || '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(rec.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* UPLOAD DOCUMENT OVERLAY MODAL */}
      {uploadingCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Upload Commissioning Evidence</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Category: {uploadingCategory}</p>
              </div>
              <button
                onClick={() => { setUploadingCategory(null); setSelectedUploadFile(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pilih Berkas <span className="text-red-500">*</span></label>
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/10 transition"
                  onClick={() => document.getElementById('evidence-select-file')?.click()}
                >
                  <input
                    id="evidence-select-file"
                    type="file"
                    className="hidden"
                    onChange={e => setSelectedUploadFile(e.target.files?.[0] || null)}
                  />
                  {selectedUploadFile ? (
                    <div className="flex flex-col items-center gap-1 text-violet-700">
                      <FileText className="w-8 h-8 text-violet-600" />
                      <span className="text-xs font-semibold truncate max-w-[200px]">{selectedUploadFile.name}</span>
                      <span className="text-[10px] text-gray-400">{formatFileSize(selectedUploadFile.size)}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Upload className="w-8 h-8 text-gray-300" />
                      <span className="text-xs text-gray-600 font-medium">Klik untuk upload berkas (.pdf, .sor, .doc, .jpg)</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Keterangan / Deskripsi Berkas</label>
                <textarea
                  rows={2}
                  value={uploadKeterangan}
                  onChange={e => setUploadKeterangan(e.target.value)}
                  placeholder="Deskripsi singkat mengenai dokumen..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => { setUploadingCategory(null); setSelectedUploadFile(null); }}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleEvidenceUpload}
                disabled={!selectedUploadFile}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow"
              >
                Simpan Berkas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE BACT FORM & SIGNATURE OVERLAY MODAL */}
      {showBactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Rilis & Tanda Tangani Berita Acara Commissioning Test</h2>
                <p className="text-[10px] text-gray-400">Isi formulir fillable kuning dan bubuhkan tanda tangan pelaksana.</p>
              </div>
              <button
                onClick={() => setShowBactModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">

              {/* Form Grid with Yellow Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Nomor Berita Acara (BA) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formNoBa}
                    onChange={e => setFormNoBa(e.target.value)}
                    placeholder="Contoh: BA-CT/RMJ/2026/001"
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Tanggal BA <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formTanggalBa}
                    onChange={e => setFormTanggalBa(e.target.value)}
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Nama Proyek <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formNamaProyek}
                    onChange={e => setFormNamaProyek(e.target.value)}
                    placeholder="Contoh: RMJ Fiber Optik 2026"
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Nomor Kontrak <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formNomorKontrak}
                    onChange={e => setFormNomorKontrak(e.target.value)}
                    placeholder="Contoh: KTR/SMARTELCO/009"
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Tanggal Kontrak</label>
                  <input
                    type="date"
                    value={formTanggalKontrak}
                    onChange={e => setFormTanggalKontrak(e.target.value)}
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200/60">
                  <label className="block text-[10px] font-bold text-yellow-700 uppercase">Pelaksana Proyek <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formPelaksana}
                    onChange={e => setFormPelaksana(e.target.value)}
                    placeholder="Contoh: PT. Telekomunikasi Indonesia"
                    className="w-full bg-yellow-100/30 border border-yellow-300/40 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Keterangan Tambahan</label>
                  <textarea
                    rows={2}
                    value={formKeterangan}
                    onChange={e => setFormKeterangan(e.target.value)}
                    placeholder="Catatan tambahan di dokumen BACT..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                  />
                </div>
              </div>

              {/* Signature Pads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Tanda Tangan Pelaksana (MITRA)</span>
                    <button
                      onClick={() => signatureMitraRef.current?.clear()}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="border rounded-xl bg-gray-50 overflow-hidden h-36">
                    <SignatureCanvas
                      ref={signatureMitraRef}
                      penColor="black"
                      canvasProps={{ className: 'w-full h-full' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Tanda Tangan Pengawas (WASPANG)</span>
                    <button
                      onClick={() => signatureWaspangRef.current?.clear()}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="border rounded-xl bg-gray-50 overflow-hidden h-36">
                    <SignatureCanvas
                      ref={signatureWaspangRef}
                      penColor="black"
                      canvasProps={{ className: 'w-full h-full' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowBactModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitBact}
                disabled={submittingBact}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5"
              >
                {submittingBact ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Merilis...</>
                ) : (
                  <><Signature className="w-3.5 h-3.5" /> Rilis & Generate BACT</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* APPROVE / REJECT OVERLAY MODAL */}
      {showApprovalModal && selectedBact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Approve / Reject BACT</h2>
              <button
                onClick={() => { setShowApprovalModal(false); setSelectedBact(null); setRejectionReason(''); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                Pilih tindakan persetujuan untuk dokumen Berita Acara Commissioning Test nomor: <strong className="text-gray-800">{selectedBact.no_ba}</strong>
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Alasan Penolakan (Wajib jika direject)</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Tulis alasan penolakan di sini..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none text-gray-700"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => handleApprovalSubmit('rejected')}
                disabled={!rejectionReason}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 text-xs font-bold rounded-lg transition"
              >
                Reject BACT
              </button>
              <button
                onClick={() => handleApprovalSubmit('approved')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition shadow"
              >
                Approve BACT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
