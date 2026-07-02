import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus, MapPin, Layers, Clock, CheckCircle2, ArrowRight, ArrowUpRight,
  ArrowDownRight, FileCheck2, PenLine, Camera, AlertTriangle, Ruler,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Stat, Panel, PanelHead, Bar as ProgressBar, StageTag, Tag, Btn, STAGES } from "../components/kit";
import { DataGrid } from "../components/DataGrid";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { dashboardService, type OperationalProgressResponse, type DashboardSummary } from '@/services/dashboardService';
import { useAuth } from '@/context/AuthContext';

import { CreateContractModal } from "@/components/modals/contract/CreateContractModal";
import { useContract } from "@/hooks/useContract";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { BOQItem } from "@/types/contract";
import { parseExcelBOQ } from "@/utils/boqParser";
import ExcelJS from "exceljs";
import { extractId } from "@/services/contractService";

const throughput = [
  { m: "Jan", survey: 8, drm: 4, instalasi: 3 },
  { m: "Feb", survey: 11, drm: 6, instalasi: 4 },
  { m: "Mar", survey: 9, drm: 8, instalasi: 6 },
  { m: "Apr", survey: 13, drm: 7, instalasi: 9 },
  { m: "Mei", survey: 10, drm: 11, instalasi: 8 },
  { m: "Jun", survey: 14, drm: 9, instalasi: 12 },
];

const recent = [
  { id: 101, ruas: "RUAS MUGI GRIYA – TEBET", project: "MUGI GRIYA – CAWANG", stage: "survey", progress: 100, len: "2.4", upd: "10 Mar" },
  { id: 103, ruas: "RUAS PANCORAN – CAWANG", project: "MUGI GRIYA – CAWANG", stage: "instalasi", progress: 65, len: "5.2", upd: "20 Mar" },
  { id: 102, ruas: "RUAS TEBET – PANCORAN", project: "MUGI GRIYA – CAWANG", stage: "drm", progress: 40, len: "3.1", upd: "15 Mar" },
  { id: 210, ruas: "RUAS SOLO – KLATEN 01", project: "FO BACKBONE JATENG", stage: "survey", progress: 28, len: "8.7", upd: "21 Mar" },
  { id: 104, ruas: "RUAS CAWANG – HALIM", project: "MUGI GRIYA – CAWANG", stage: "preparation", progress: 0, len: "1.8", upd: "—" },
];

const attention = [
  { icon: FileCheck2, tone: "violet" as const, label: "Rekonsiliasi BOQ", ruas: "RUAS TEBET – PANCORAN", meta: "3 item konflik volume", time: "12m", action: "Resolve" },
  { icon: PenLine, tone: "red" as const, label: "BA Survey menunggu TTD", ruas: "RUAS MUGI GRIYA – TEBET", meta: "Waspang · Telkom Infra", time: "1j", action: "Tanda Tangan" },
  { icon: Camera, tone: "amber" as const, label: "Foto evidence ditolak", ruas: "RUAS PANCORAN – CAWANG", meta: "STA 0+075 · geo-tag tidak valid", time: "3j", action: "Tinjau" },
  { icon: AlertTriangle, tone: "red" as const, label: "POW Actual delay 2 hari", ruas: "RUAS PANCORAN – CAWANG", meta: "Penarikan Kabel FO", time: "5j", action: "Lihat Gantt" },
];

export function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [operationalProgress, setOperationalProgress] = useState<OperationalProgressResponse | null>(null);
  const [summaryStats, setSummaryStats] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const {
    createContract: createApiContract
  } = useContract();

  const { toast, showToast, hideToast } = useToast();

  // Create Project Modal Form States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [boqFileName, setBOQFileName] = useState<string>('');
  const [boqFile, setBOQFile] = useState<File | null>(null);
  const [kmlFileName, setKMLFileName] = useState<string>('');
  const [kmlFile, setKMLFile] = useState<File | null>(null);
  const [showKMLPreview, setShowKMLPreview] = useState<boolean>(false);
  const [kmlPreviewData, setKMLPreviewData] = useState<string>('');
  const [isDraggingBOQ, setIsDraggingBOQ] = useState<boolean>(false);
  const [isDraggingKML, setIsDraggingKML] = useState<boolean>(false);
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    nomorKontrak: '',
    namaProject: '',
    contractSigned: '',
    contractValue: '',
    contractDuration: '',
    startDatePlan: '',
    endDatePlan: '',
    location: '',
    link: '',
    lokasi: '',
    employeer: 'PT. Telkom Indonesia',
    mainVendor: 'PT. Telkom Infra',
    pelaksana: ''
  });

  const [ssLinks, setSSLinks] = useState<Array<{ link_name: string; sub_pelaksana?: string; ss_contract_value?: string; kml_file?: File }>>([
    { link_name: '', sub_pelaksana: '', ss_contract_value: '' }
  ]);

  const parseExcelBOQLocal = async (file: File) => {
    try {
      console.log('📄 Parsing Excel file:', file.name);
      const boqData = await parseExcelBOQ(file);
      setBOQItems(boqData);
      console.log(`✅ Loaded ${boqData.length} BOQ items`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      showToast(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleBOQUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBOQFileName(file.name);
      setBOQFile(file);
      await parseExcelBOQLocal(file);
    }
  };

  const handleKMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setKMLFileName(file.name);
      setKMLFile(file);

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.kmz')) {
        console.log('📦 Processing KMZ file...');
        try {
          const { extractKMLFromKMZ } = await import('@/utils/kmlToGeoJSON');
          const kmlString = await extractKMLFromKMZ(file);
          setKMLPreviewData(kmlString);
          console.log('✅ KMZ extracted successfully');
        } catch (error) {
          console.error('❌ Error extracting KMZ:', error);
          showToast('Failed to extract KMZ file. Please try again.', 'error');
        }
      } else if (fileName.endsWith('.kml')) {
        console.log('📄 Processing KML file...');
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setKMLPreviewData(content);
        };
        reader.readAsText(file);
      } else {
        showToast('Please upload a KML or KMZ file', 'warning');
      }
    }
  };

  const handleKMLPreview = () => {
    if (kmlPreviewData) {
      setShowKMLPreview(true);
    }
  };

  const handleBOQDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBOQ(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setBOQFileName(file.name);
      setBOQFile(file);
      await parseExcelBOQLocal(file);
    }
  };

  const handleKMLDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingKML(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.kml') || file.name.endsWith('.kmz'))) {
      setKMLFileName(file.name);
      setKMLFile(file);

      if (file.name.endsWith('.kmz')) {
        try {
          const { extractKMLFromKMZ } = await import('@/utils/kmlToGeoJSON');
          const kmlString = await extractKMLFromKMZ(file);
          setKMLPreviewData(kmlString);
          console.log('✅ KMZ extracted successfully');
        } catch (error) {
          console.error('❌ Error extracting KMZ:', error);
          showToast('Failed to extract KMZ file. Please try again.', 'error');
        }
      } else if (file.name.endsWith('.kml')) {
        console.log('📄 Processing dropped KML file...');
        setKMLFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setKMLPreviewData(content);
        };
        reader.readAsText(file);
      } else {
        showToast('Please drop a KML or KMZ file', 'warning');
      }
    }
  };

  const handleAddBOQRow = () => {
    const newRow: BOQItem = {
      id: String(boqItems.length + 1),
      designator: '',
      uraianPekerjaan: '',
      satuan: 'Meter',
      material: '0',
      jasa: '0',
      drm: '0',
      actual: '0',
      tambah: '0',
      kurang: '0',
    };
    setBOQItems([...boqItems, newRow]);
  };

  const handleDeleteBOQRow = (id: string) => {
    setBOQItems(boqItems.filter(item => item.id !== id));
  };

  const handleBOQItemChange = (id: string, field: keyof BOQItem, value: string) => {
    setBOQItems(boqItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateContract = async () => {
    const requiredFields = [
      { field: 'namaProject', label: 'Project Name' },
      { field: 'nomorKontrak', label: 'No. Contract' },
      { field: 'contractSigned', label: 'Contract Signed' },
      { field: 'startDatePlan', label: 'Start Date' },
      { field: 'endDatePlan', label: 'End Date' },
      { field: 'employeer', label: 'Customer' },
      { field: 'mainVendor', label: 'Pelaksana' },
      { field: 'lokasi', label: 'Region' },
      { field: 'location', label: 'Location' }
    ];

    const emptyFields = requiredFields.filter(({ field }) => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData].trim() === '');

    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(f => f.label).join(', ');
      showToast(`Please fill in all required fields: ${fieldNames}`, 'warning');
      return;
    }

    const validLinks = ssLinks.filter(link => link.link_name && link.link_name.trim() !== '');

    if (validLinks.length === 0) {
      showToast('Please add at least one SS/Link', 'warning');
      return;
    }

    const linksWithoutKML = validLinks.filter(link => !link.kml_file);

    if (linksWithoutKML.length > 0) {
      const linkNames = linksWithoutKML.map(link => link.link_name).join(', ');
      showToast(`Please upload KML file for: ${linkNames}`, 'warning');
      return;
    }

    setIsCreatingContract(true);

    try {
      const { mapBOQItemToBackend, uploadFile } = await import('@/services/contractService');
      const { authService } = await import('@/services/authService');

      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      let boqFilePath: string | undefined;

      if (boqFile) {
        try {
          const boqUploadResult = await uploadFile(boqFile, 'boq_planned', token);
          boqFilePath = boqUploadResult.file_path;
        } catch (error) {
          console.error('❌ BOQ upload failed:', error);
          throw new Error(`BOQ upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      let contractDocumentMetadata: any = undefined;
      const contractDocFile = (formData as any).contractDocFile;
      if (contractDocFile) {
        try {
          const contractUploadResult = await uploadFile(contractDocFile, 'contract_document', token);
          contractDocumentMetadata = {
            file_path: contractUploadResult.file_path,
            file_name: contractUploadResult.file_name || contractDocFile.name,
            file_type: contractUploadResult.file_type || contractDocFile.type,
            file_size: contractUploadResult.file_size || contractDocFile.size,
            keterangan: 'Contract document',
            status: 'approved'
          };
        } catch (error) {
          console.error('❌ Contract document upload failed:', error);
          throw new Error(`Contract document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      let otherDocumentsMetadata: any[] = [];
      const otherDocsData = (formData as any).otherDocsData;
      if (otherDocsData && otherDocsData.length > 0) {
        for (const doc of otherDocsData) {
          try {
            const otherUploadResult = await uploadFile(doc.file, 'other_document_project', token);
            otherDocumentsMetadata.push({
              file_path: otherUploadResult.file_path,
              file_name: otherUploadResult.file_name || doc.file.name,
              file_type: otherUploadResult.file_type || doc.file.type,
              file_size: otherUploadResult.file_size || doc.file.size,
              title: doc.title || null,
              keterangan: doc.title || 'Other project document',
              status: 'approved'
            });
          } catch (error) {
            console.error(`❌ Other document upload failed for ${doc.fileName}:`, error);
            throw new Error(`Other document upload failed for ${doc.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      const isValidId = (value: string | null | undefined): boolean => {
        if (!value) return false;
        return /^[a-zA-Z0-9:_-]+$/.test(value) && value.length > 5;
      };

      const hasValidRegionalWitel = isValidId(formData.lokasi) && isValidId(formData.location);

      if (!hasValidRegionalWitel) {
        throw new Error('Regional and Witel are required. Please select valid Regional and Witel from the dropdowns.');
      }

      const linksWithKML: any[] = [];

      for (let i = 0; i < ssLinks.length; i++) {
        const link = ssLinks[i];

        if (!link.link_name || !link.link_name.trim()) {
          continue;
        }

        const linkData: any = {
          link_name: link.link_name.trim(),
          regional: formData.lokasi,
          witel: formData.location,
          sub_pelaksana: link.sub_pelaksana || undefined,
          ss_contract_value: link.ss_contract_value || undefined
        };

        if (link.kml_file) {
          try {
            const kmlUploadResult = await uploadFile(link.kml_file, 'kml_planned', token);

            linkData.kml_document = {
              file_path: kmlUploadResult.file_path,
              file_name: kmlUploadResult.file_name || link.kml_file.name,
              file_type: kmlUploadResult.file_type || 'application/vnd.google-earth.kml+xml',
              file_size: kmlUploadResult.file_size || link.kml_file.size,
              keterangan: `KML planned for ${link.link_name}`,
              status: 'approved'
            };
          } catch (error) {
            console.error(`❌ KML upload failed for "${link.link_name}":`, error);
            throw new Error(`KML upload failed for "${link.link_name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        linksWithKML.push(linkData);
      }

      const boqData = boqItems.length > 0 ? mapBOQItemToBackend(boqItems) : undefined;

      const contractSignedISO = formData.contractSigned ? new Date(formData.contractSigned).toISOString() : undefined;
      const startDatePlanISO = formData.startDatePlan ? new Date(formData.startDatePlan).toISOString() : undefined;
      const endDatePlanISO = formData.endDatePlan ? new Date(formData.endDatePlan).toISOString() : undefined;

      const requestPayload = {
        name: formData.namaProject,
        regional: isValidId(formData.lokasi) ? formData.lokasi : undefined,
        witel: isValidId(formData.location) ? formData.location : undefined,
        region: formData.lokasi,
        status: 'on_going',
        no_kontrak: formData.nomorKontrak,
        pelaksana: formData.pelaksana || undefined,
        employeer: formData.employeer || undefined,
        main_vendor: formData.mainVendor || undefined,
        contract_signed: contractSignedISO,
        contract_value: formData.contractValue || undefined,
        contract_duration: formData.contractDuration || undefined,
        start_date_plan: startDatePlanISO,
        end_date_plan: endDatePlanISO,
        links: linksWithKML.length > 0 ? linksWithKML : undefined,
        boq_id: boqFilePath,
        boq_data: boqData,
        contract_document: contractDocumentMetadata,
        other_documents: otherDocumentsMetadata.length > 0 ? otherDocumentsMetadata : undefined
      };

      const newApiContract = await createApiContract(requestPayload);
      const projectId = extractId(newApiContract.id);

      // Initialize BOQ detail for each link sequentially
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const projectDetail = await projectDetailResponse.json();
        const createdLinks = projectDetail.links || [];

        for (let i = 0; i < createdLinks.length; i++) {
          const link = createdLinks[i];
          try {
            const linkId = extractId(link.id);
            const initializeUrl = `${baseUrl}/links/${linkId}/boq-detail/initialize`;

            const response = await fetch(initializeUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`❌ API Error:`, errorData);
            }
          } catch (error) {
            console.error(`❌ Failed to initialize BOQ detail for ${link.link_name}:`, error);
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch project details for link initialization:', err);
      }

      showToast('Project created successfully!', 'success');

      // Save to localStorage for select effect
      localStorage.setItem('selectedContractId', projectId);

      // Reload dashboard data
      loadDashboardData();

      // Close modal and reset state
      setShowCreateModal(false);
      setFormData({
        nomorKontrak: '',
        namaProject: '',
        contractSigned: '',
        contractValue: '',
        contractDuration: '',
        startDatePlan: '',
        endDatePlan: '',
        location: '',
        link: '',
        lokasi: '',
        employeer: 'PT. Telkom Indonesia',
        mainVendor: 'PT. Telkom Infra',
        pelaksana: ''
      });
      setBOQItems([]);
      setBOQFileName('');
      setBOQFile(null);
      setKMLFileName('');
      setKMLFile(null);
      setKMLPreviewData('');
      setSSLinks([{ link_name: '', sub_pelaksana: '', ss_contract_value: '' }]);

      // Redirect to project tab to show details
      onNavigate?.('project');
    } catch (error: any) {
      console.error('❌ Error creating project:', error);
      showToast(error.message || 'Failed to create project', 'error');
    } finally {
      setIsCreatingContract(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [progress, summary] = await Promise.all([
        dashboardService.getOperationalProgress(token),
        dashboardService.getDashboardSummary(token),
      ]);
      setOperationalProgress(progress);
      setSummaryStats(summary);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = summaryStats || {
    total_projects: 0,
    active_projects: 0,
    survey_completion: 0,
    drm_pending: 0,
    install_progress: 0,
    risk_count: 0,
  };

  const funnel = operationalProgress && stats.total_projects > 0 ? [
    { key: "survey", count: operationalProgress.progress.survey.completed_projects, total: stats.total_projects },
    { key: "drm", count: operationalProgress.progress.drm.completed_projects, total: stats.total_projects },
    { key: "instalasi", count: operationalProgress.progress.installation.completed_projects, total: stats.total_projects },
    { key: "done", count: Math.floor(operationalProgress.progress.installation.completed_projects * 0.8), total: stats.total_projects },
  ] as const : [
    { key: "survey", count: 70, total: 156 },
    { key: "drm", count: 39, total: 156 },
    { key: "instalasi", count: 31, total: 156 },
    { key: "done", count: 16, total: 156 },
  ] as const;

  const maxFunnel = funnel[0]?.count || 1;
  const totalRuas = stats.total_projects > 0 ? stats.total_projects : 156;

  const risksData = (operationalProgress && operationalProgress.risks.length > 0) ? operationalProgress.risks.map(r => ({
    icon: r.category === 'survey' ? Camera : r.category === 'drm' ? FileCheck2 : PenLine,
    tone: (r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'violet') as "red"|"amber"|"violet",
    label: r.title,
    ruas: r.category.toUpperCase(),
    meta: `${r.severity} Severity`,
    time: "Baru",
    action: "Tinjau"
  })) : attention;

  const recentColDefs = useMemo<ColDef[]>(() => [
    {
      headerName: "Ruas", field: "ruas", flex: 2, minWidth: 220, cellRenderer: (p: ICellRendererParams) => (
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('project'); }} className="flex flex-col justify-center h-full group hover:text-[#EF4444]">
          <p className="font-medium leading-tight text-[#0F172A]">{p.data.ruas}</p>
          <p className="font-mono text-[11px] text-[#94A3B8] leading-none mt-0.5">{p.data.project}</p>
        </a>
      )
    },
    { headerName: "Tahap", field: "stage", width: 130, cellRenderer: (p: ICellRendererParams) => <div className="flex h-full items-center"><StageTag stage={p.value as any} /></div> },
    { headerName: "Progress", field: "progress", width: 160, cellRenderer: (p: ICellRendererParams) => (
      <div className="flex h-full items-center gap-2 w-full">
        <ProgressBar value={p.value} color={STAGES[p.data.stage as keyof typeof STAGES]?.hex} className="max-w-[90px] flex-1" />
        <span className="w-9 font-mono text-xs tabular-nums text-[#94A3B8]">{p.value}%</span>
      </div>
    )},
    { headerName: "Panjang", field: "len", width: 100, cellRenderer: (p: ICellRendererParams) => <div className="flex h-full items-center justify-end w-full pr-3 font-mono text-xs tabular-nums text-[#0F172A]">{p.value} km</div> },
    { headerName: "Update", field: "upd", width: 100, cellRenderer: (p: ICellRendererParams) => <div className="flex h-full items-center justify-end w-full pr-5 font-mono text-xs text-[#94A3B8]">{p.value}</div> }
  ], [onNavigate]);

  return (
    <div className="mx-auto max-w-[1400px] py-1">
      {/* Header */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">Command Center</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F172A]">Ringkasan Operasional</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Monitoring siklus proyek fiber-optic — Survey, DRM &amp; Instalasi.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-all flex items-center gap-2 font-semibold">Export Laporan</button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-semibold hover:bg-[#1D4ED8] transition-all flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Tambah Project
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Project" value={stats.total_projects > 0 ? stats.total_projects.toString() : "24"} accent="#94A3B8" icon={<Layers className="h-4 w-4" />}
          hint={<span className="inline-flex items-center gap-1 text-[#15803d]"><ArrowUpRight className="h-3.5 w-3.5" />3 baru bulan ini</span>} />
        <Stat label="Ruas Aktif" value={stats.active_projects > 0 ? stats.active_projects.toString() : "156"} accent="#3B82F6" icon={<MapPin className="h-4 w-4" />}
          hint={<span className="inline-flex items-center gap-1 text-[#15803d]"><ArrowUpRight className="h-3.5 w-3.5" />+12 vs lalu</span>} />
        <Stat label="Menunggu DRM" value={stats.drm_pending > 0 ? stats.drm_pending.toString() : "18"} accent="#F97316" icon={<Clock className="h-4 w-4" />}
          hint={<span className="inline-flex items-center gap-1 text-[#b45309]"><ArrowDownRight className="h-3.5 w-3.5" />2 overdue</span>} />
        <Stat label="Total Panjang FO" value="482" unit="km" accent="#10B981" icon={<Ruler className="h-4 w-4" />}
          hint={<span className="text-[#94A3B8]">316 km tersurvey · {stats.survey_completion > 0 ? Math.round(stats.survey_completion) : 65}%</span>} />
      </div>

      {/* Mid grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Throughput */}
        <Panel className="lg:col-span-2 p-0">
          <PanelHead
            title="Throughput Modul"
            sub="Jumlah ruas yang menyelesaikan tiap tahap per bulan"
            action={<div className="hidden items-center gap-3 sm:flex">
              {[["Survey", STAGES.survey.hex], ["DRM", STAGES.drm.hex], ["Instalasi", STAGES.instalasi.hex]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: c as string }} />{l}
                </span>
              ))}
            </div>}
          />
          <div className="h-72 p-2 pr-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput} barGap={3} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#94A3B8" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#94A3B8" }} width={28} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "var(--font-sans)", boxShadow: "0 8px 24px rgba(0,0,0,.08)" }} />
                <Bar dataKey="survey" stackId="a" fill={STAGES.survey.hex} radius={[0, 0, 0, 0]} />
                <Bar dataKey="drm" stackId="a" fill={STAGES.drm.hex} />
                <Bar dataKey="instalasi" stackId="a" fill={STAGES.instalasi.hex} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Funnel */}
        <Panel className="p-0">
          <PanelHead title="Distribusi Tahap Ruas" sub={`${totalRuas} ruas total`} />
          <div className="space-y-4 p-4">
            {funnel.map((f) => {
              const s = STAGES[f.key as keyof typeof STAGES];
              const pct = Math.round((f.count / totalRuas) * 100);
              return (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <StageTag stage={f.key as keyof typeof STAGES} />
                    <span className="font-mono text-sm tabular-nums text-[#0F172A]">{f.count} <span className="text-[#94A3B8]">· {pct}%</span></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#0F172A]/8">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(f.count / maxFunnel) * 100}%`, background: s.hex }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                <span className="text-[#94A3B8]">Completion rate</span>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-[#15803d]">{stats.install_progress > 0 ? Math.round(stats.install_progress) : 62}%</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Recent ruas */}
        <Panel className="lg:col-span-2 p-0">
          <PanelHead title="Aktivitas Ruas Terbaru" action={<a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('semua-ruas'); }} className="inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline">Semua ruas <ArrowRight className="h-4 w-4" /></a>} />
          <div className="flex-1 w-full overflow-hidden" style={{ height: 280 }}>
            <DataGrid rowData={recent} columnDefs={recentColDefs} rowHeight={56} />
          </div>
        </Panel>

        {/* Attention queue */}
        <Panel className="p-0">
          <PanelHead title="Perlu Perhatian" sub="Antrian approval & isu" action={<Tag tone="red" dot>{risksData.length}</Tag>} />
          <div className="divide-y divide-[#E2E8F0]/60">
            {risksData.map((a, i) => (
              <div key={i} className="flex gap-2.5 px-4 py-2 transition-colors hover:bg-[#F1F5F9]/40">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                  a.tone === "red" ? "bg-[#e4002b]/10 text-[#c00023]" : a.tone === "violet" ? "bg-[#7c5cfc]/10 text-[#6d4dfb]" : "bg-[#f59e0b]/15 text-[#b45309]"}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium leading-tight text-[#0F172A]">{a.label}</p>
                    <span className="shrink-0 font-mono text-[10px] text-[#94A3B8]">{a.time}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[#94A3B8]">{a.ruas}</p>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">{a.meta}</p>
                  <button className="mt-1.5 text-xs font-medium text-[#2563EB] hover:underline">{a.action} →</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Create Project Modal */}
      <CreateContractModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        setFormData={setFormData}
        ssLinks={ssLinks}
        setSSLinks={setSSLinks}
        boqItems={boqItems}
        boqFileName={boqFileName}
        kmlFileName={kmlFileName}
        kmlPreviewData={kmlPreviewData}
        isDraggingBOQ={isDraggingBOQ}
        isDraggingKML={isDraggingKML}
        isCreatingContract={isCreatingContract}
        setIsDraggingBOQ={setIsDraggingBOQ}
        setIsDraggingKML={setIsDraggingKML}
        handleBOQUpload={handleBOQUpload}
        handleKMLUpload={handleKMLUpload}
        handleBOQDrop={handleBOQDrop}
        handleKMLDrop={handleKMLDrop}
        handleKMLPreview={handleKMLPreview}
        handleAddBOQRow={handleAddBOQRow}
        handleDeleteBOQRow={handleDeleteBOQRow}
        handleBOQItemChange={handleBOQItemChange}
        handleCreateContract={handleCreateContract}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
    </div>
  );
}
