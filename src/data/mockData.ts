import { Project, Ruas, SurveyData, BOQItem } from '../types';

export const mockProjects: Project[] = [
  {
    id: 'p1',
    projectName: 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ',
    noContract: 'K.TEL.005422/HK.810/GPP-A0000000/2024',
    contractSigned: '19 November 2024',
    contractValue: 'Rp 8,500,000,000',
    contractDuration: '6 Months',
    startDatePlan: '20 Nov 2024',
    endDatePlan: '20 May 2025',
    ssLink: 'SS#17 STO SUMENEP-STO AMBUNTEN',
    location: {
      lat: -7.009,
      lng: 113.861,
      name: 'Witel SURAMADU'
    },
    region: 'JAWA TIMUR',
    contractor: 'PT Meindo Elang',
    status: 'survey',
    progress: 65,
    createdBy: 'Admin',
    hasKML: true,
    kmlFiles: [
       { id: 'k1', name: 'Route_SS17_Sumenep_Ambunten_V1.kml', url: '#', uploadDate: '20 Nov 2024', size: '2.4 MB' },
       { id: 'k2', name: 'Route_SS17_Sumenep_Ambunten_V2_Rev.kml', url: '#', uploadDate: '25 Nov 2024', size: '2.5 MB' }
    ],
    surveyProgress: { completed: 45, total: 65 }
  },
  {
    id: 'p2',
    projectName: 'STO-SUMBANG-001 OSP Deployment',
    noContract: 'NO-8976/HK.810/JTG-S001/2024',
    contractSigned: '15 December 2024',
    contractValue: 'Rp 800,000,000',
    contractDuration: '3 Months',
    startDatePlan: '22 Jan 2025',
    endDatePlan: '22 Apr 2025',
    ssLink: 'SS#05 STO SUMBANG-PURWOKERTO',
    location: {
      lat: -7.424,
      lng: 109.230,
      name: 'SOKARAJA'
    },
    region: 'JAWA TENGAH',
    contractor: 'PT Meindo Elang',
    status: 'drm',
    progress: 42,
    createdBy: 'Dzaky',
    hasKML: true,
    kmlFiles: [{ id: 'k3', name: 'Sumbang_Main_Route.kml', url: '#', uploadDate: '10 Jan 2025', size: '1.1 MB' }]
  },
  {
    id: 'p3',
    projectName: 'Route Fiber Optic Deployment Purwokerto Timur',
    noContract: 'NO-89768/HK.810/JTG-A002/2024',
    contractSigned: '10 January 2025',
    contractValue: 'Rp 650,000,000',
    contractDuration: '4 Months',
    startDatePlan: '22 Jan 2025',
    endDatePlan: '22 May 2025',
    ssLink: 'SS#08 PURWOKERTO-KEMBARAN',
    location: {
      lat: -7.432,
      lng: 109.255,
      name: 'PURWOKERTO'
    },
    region: 'JAWA TENGAH',
    contractor: 'SMARTELCO',
    status: 'created',
    progress: 5,
    createdBy: 'Dzaky',
    hasKML: false,
    kmlFiles: []
  },
  {
    id: 'p4',
    projectName: 'Single Ruas Project Demo - Bandung Utara',
    noContract: 'NO-9988/HK.810/JBR-B001/2024',
    contractSigned: '20 January 2025',
    contractValue: 'Rp 500,000,000',
    contractDuration: '2 Months',
    startDatePlan: '05 Feb 2025',
    endDatePlan: '05 Apr 2025',
    ssLink: 'SS#21 DAGO-LEMBANG',
    location: {
      lat: -6.875,
      lng: 107.619,
      name: 'BANDUNG'
    },
    region: 'JAWA BARAT',
    contractor: 'PT Meindo Elang',
    status: 'survey',
    progress: 25,
    createdBy: 'Admin',
    hasKML: true,
    kmlFiles: [{ id: 'k4', name: 'Dago_Lembang_Survey.kml', url: '#', uploadDate: '01 Feb 2025', size: '3.0 MB' }]
  },
  {
    id: 'p10',
    projectName: 'Backbone Fiber Optic Trans-Sulawesi (Makassar)',
    noContract: 'HK.900/SLW-M001/2024',
    contractSigned: '01 January 2025',
    contractValue: 'Rp 15,000,000,000',
    contractDuration: '12 Months',
    startDatePlan: '15 Jan 2025',
    endDatePlan: '15 Jan 2026',
    ssLink: 'SS#88 MAKASSAR-PAREPARE',
    location: {
      lat: -5.147,
      lng: 119.432,
      name: 'MAKASSAR'
    },
    region: 'SULAWESI',
    contractor: 'PT Meindo Elang',
    status: 'survey',
    progress: 30,
    createdBy: 'Hasan',
    hasKML: true,
    kmlFiles: [{ id: 'k8', name: 'Trans_Sulawesi_Sec1.kml', url: '#', uploadDate: '10 Jan 2025', size: '12.5 MB' }]
  }
];

export const mockRuas: Ruas[] = [
  // P1: Multi-Ruas
  {
    id: 'r1_1',
    projectId: 'p1',
    name: 'Ruas 1: STO Sumenep - Gapura',
    sto: 'STO Sumenep',
    ruasCode: 'SK-001',
    route: 'Jl. Raya Sumenep',
    totalDesignators: 45,
    completedDesignators: 30,
    spans: [
      {
        id: 's1_1_1',
        ruasId: 'r1_1',
        name: 'Span 1 (KM 0-2)',
        designators: Array(5).fill(null).map((_, i) => ({
          id: `d1_1_${i}`,
          no: i + 1,
          offset: `${i * 50}`,
          offsetFrom: '0',
          offsetTo: '250',
          length: '50',
          depth: '150',
          location: 'Pinggir Jalan Raya',
          designator: i % 2 === 0 ? 'Tiang Besi 7m' : 'Tiang Beton 9m',
          soilType: 'Tanah Liat',
          hasCoordinates: true,
          latitude: '-7.009',
          longitude: '113.861',
          status: 'verified'
        }))
      },
      {
         id: 's1_1_2',
         ruasId: 'r1_1',
         name: 'Span 2 (KM 2-4)',
         designators: []
      }
    ]
  },
  {
    id: 'r1_2',
    projectId: 'p1',
    name: 'Ruas 2: Gapura - Ambunten',
    sto: 'STO Gapura',
    ruasCode: 'SK-002',
    route: 'Jl. Raya Ambunten',
    totalDesignators: 20,
    completedDesignators: 15,
    spans: [
       {
          id: 's1_2_1',
          ruasId: 'r1_2',
          name: 'Span 1 (KM 0-5)',
          designators: []
       }
    ]
  },
  // P2: Single Ruas
  {
     id: 'r2_1',
     projectId: 'p2',
     name: 'Ruas Utama: Sokaraja - Purwokerto',
     sto: 'STO Sokaraja',
     ruasCode: 'SP-001',
     route: 'Jl. Jend. Soedirman',
     totalDesignators: 80,
     completedDesignators: 30,
     spans: [
        {
           id: 's2_1_1',
           ruasId: 'r2_1',
           name: 'Span A (Depan RS Margono)',
           designators: []
        }
     ]
  },
  // P4: Single Ruas
  {
     id: 'r4_1',
     projectId: 'p4',
     name: 'Ruas Dago - Lembang',
     sto: 'STO Dago',
     ruasCode: 'DL-101',
     route: 'Jl. Ir. H. Juanda',
     totalDesignators: 15,
     completedDesignators: 3,
     spans: []
  },
  // P10: Multi-Ruas
  {
     id: 'r10_1',
     projectId: 'p10',
     name: 'Segmen 1: Makassar - Maros',
     sto: 'STO Panakkukang',
     ruasCode: 'MM-01',
     route: 'Jl. Poros Makassar-Maros',
     totalDesignators: 120,
     completedDesignators: 40,
     spans: []
  },
  {
     id: 'r10_2',
     projectId: 'p10',
     name: 'Segmen 2: Maros - Pangkep',
     sto: 'STO Maros',
     ruasCode: 'MP-02',
     route: 'Jl. Poros Maros-Pangkep',
     totalDesignators: 150,
     completedDesignators: 10,
     spans: []
  }
];

export const mockBOQItems: BOQItem[] = [
  {
    id: 1,
    designator: 'Tiang Besi 7m',
    description: 'Pengadaan dan pemasangan tiang besi 7 meter lengkap dengan aksesoris',
    satuan: 'Batang',
    hargaMaterial: 1500000,
    hargaJasa: 500000,
    drm: 50,
    actual: 45,
    tambah: 0,
    kurang: 5
  },
  {
    id: 2,
    designator: 'Kabel FO 24 Core',
    description: 'Pengadaan kabel fiber optic udara 24 core SM G.652D',
    satuan: 'Meter',
    hargaMaterial: 15000,
    hargaJasa: 5000,
    drm: 2000,
    actual: 2100,
    tambah: 100,
    kurang: 0
  },
  {
    id: 3,
    designator: 'Handhole Type A',
    description: 'Pembuatan handhole tipe A ukuran 80x80x80 cm',
    satuan: 'Unit',
    hargaMaterial: 2500000,
    hargaJasa: 1000000,
    drm: 10,
    actual: 10,
    tambah: 0,
    kurang: 0
  }
];

export const mockSurveyData: SurveyData[] = [];

export const currentUser = {
  name: 'Admin User',
  avatar: 'A',
  role: 'Administrator'
};
