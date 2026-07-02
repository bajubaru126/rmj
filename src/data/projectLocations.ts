import { ProjectLocation } from '../types/map';

/**
 * 4 Realistic Fiber Optic Projects across Indonesia
 * Each project has longer routes (8-12 designators) following real roads
 */

export const projectLocations: ProjectLocation[] = [
  // 1. Jakarta - Tangerang Fiber Backbone
  {
    id: 'project-jakarta-tangerang-01',
    name: 'Jakarta - Tangerang Fiber Backbone',
    type: 'fiber',
    status: 'active',
    location: {
      lat: -6.1751,
      lng: 106.7900,
      address: 'Jakarta Barat - Tangerang',
      province: 'DKI Jakarta',
      city: 'Jakarta'
    },
    details: {
      contractor: 'PT Telkom Akses',
      startDate: '2025-11-15',
      endDate: '2026-05-30',
      progress: 68,
      budget: 52000000000,
      spent: 35360000000,
      team: 95,
      description: 'Pembangunan backbone fiber optik Jakarta-Tangerang via Jl. Daan Mogot'
    },
    stats: {
      fiberLength: 18500,
      equipment: 145,
      issues: 2
    },
    routes: [
      {
        id: 'span-jkt-tng-01',
        name: 'JKT-TNG-01',
        stoFrom: 'STO Grogol',
        stoTo: 'STO Kalideres',
        designator: 'BC-TR-C-1',
        color: '#8B4513',
        coordinates: [
          [106.7900, -6.1650], // STO Grogol
          [106.7850, -6.1655],
          [106.7800, -6.1660],
          [106.7750, -6.1665],
          [106.7700, -6.1670],
          [106.7650, -6.1675],
          [106.7600, -6.1680],
          [106.7550, -6.1685],
          [106.7500, -6.1690],
          [106.7450, -6.1695]  // STO Kalideres
        ],
        length: 5200,
        description: 'Route Grogol-Kalideres via Jl. Daan Mogot - 10 designators'
      },
      {
        id: 'span-jkt-tng-02',
        name: 'JKT-TNG-02',
        stoFrom: 'STO Kalideres',
        stoTo: 'STO Cengkareng',
        designator: 'BCTR-KH-3',
        color: '#D2691E',
        coordinates: [
          [106.7450, -6.1695],
          [106.7400, -6.1700],
          [106.7350, -6.1705],
          [106.7300, -6.1710],
          [106.7250, -6.1715],
          [106.7200, -6.1720],
          [106.7150, -6.1725],
          [106.7100, -6.1730],
          [106.7050, -6.1735]  // STO Cengkareng
        ],
        length: 4600,
        description: 'Route Kalideres-Cengkareng - 9 designators'
      },
      {
        id: 'span-jkt-tng-03',
        name: 'JKT-TNG-03',
        stoFrom: 'STO Cengkareng',
        stoTo: 'STO Tangerang',
        designator: 'BM1',
        color: '#2F4F4F',
        coordinates: [
          [106.7050, -6.1735],
          [106.6950, -6.1745],
          [106.6850, -6.1755],
          [106.6750, -6.1765],
          [106.6650, -6.1775],
          [106.6550, -6.1785],
          [106.6450, -6.1795],
          [106.6350, -6.1805],
          [106.6250, -6.1815],
          [106.6150, -6.1825],
          [106.6050, -6.1835]  // STO Tangerang
        ],
        length: 8700,
        description: 'Route Cengkareng-Tangerang - 11 designators'
      }
    ]
  },

  // 2. Surabaya Ring Road Fiber
  {
    id: 'project-surabaya-ring-01',
    name: 'Surabaya Ring Road Fiber Network',
    type: 'fiber',
    status: 'construction',
    location: {
      lat: -7.2575,
      lng: 112.7521,
      address: 'Surabaya',
      province: 'Jawa Timur',
      city: 'Surabaya'
    },
    details: {
      contractor: 'PT Telkom Akses Jatim',
      startDate: '2026-01-10',
      endDate: '2026-07-15',
      progress: 42,
      budget: 48000000000,
      spent: 20160000000,
      team: 78,
      description: 'Pembangunan ring fiber optik Surabaya via Jl. Ahmad Yani'
    },
    stats: {
      fiberLength: 21200,
      equipment: 132,
      issues: 3
    },
    routes: [
      {
        id: 'span-sby-ring-01',
        name: 'SBY-RING-01',
        stoFrom: 'STO Gubeng',
        stoTo: 'STO Wonokromo',
        designator: 'BC-TR-S-3',
        color: '#654321',
        coordinates: [
          [112.7521, -7.2575],
          [112.7500, -7.2600],
          [112.7480, -7.2625],
          [112.7460, -7.2650],
          [112.7440, -7.2675],
          [112.7420, -7.2700],
          [112.7400, -7.2725],
          [112.7380, -7.2750],
          [112.7360, -7.2775],
          [112.7340, -7.2800]
        ],
        length: 5800,
        description: 'Route Gubeng-Wonokromo via Jl. Ahmad Yani - 10 designators'
      },
      {
        id: 'span-sby-ring-02',
        name: 'SBY-RING-02',
        stoFrom: 'STO Wonokromo',
        stoTo: 'STO Waru',
        designator: 'BSS',
        color: '#CD5C5C',
        coordinates: [
          [112.7340, -7.2800],
          [112.7370, -7.2825],
          [112.7400, -7.2850],
          [112.7430, -7.2875],
          [112.7460, -7.2900],
          [112.7490, -7.2925],
          [112.7520, -7.2950],
          [112.7550, -7.2975],
          [112.7580, -7.3000],
          [112.7610, -7.3025]
        ],
        length: 6200,
        description: 'Route Wonokromo-Waru - 10 designators'
      },
      {
        id: 'span-sby-ring-03',
        name: 'SBY-RING-03',
        stoFrom: 'STO Waru',
        stoTo: 'STO Rungkut',
        designator: 'PP-IN',
        color: '#DEB887',
        coordinates: [
          [112.7610, -7.3025],
          [112.7640, -7.3000],
          [112.7670, -7.2975],
          [112.7700, -7.2950],
          [112.7730, -7.2925],
          [112.7760, -7.2900],
          [112.7790, -7.2875],
          [112.7820, -7.2850],
          [112.7850, -7.2825],
          [112.7880, -7.2800],
          [112.7910, -7.2775]
        ],
        length: 7200,
        description: 'Route Waru-Rungkut - 11 designators'
      }
    ]
  },

  // 3. Bandung - Cimahi Fiber Link
  {
    id: 'project-bandung-cimahi-01',
    name: 'Bandung - Cimahi Fiber Link',
    type: 'fiber',
    status: 'planning',
    location: {
      lat: -6.9175,
      lng: 107.6191,
      address: 'Bandung - Cimahi',
      province: 'Jawa Barat',
      city: 'Bandung'
    },
    details: {
      contractor: 'PT Telkom Akses Jabar',
      startDate: '2026-03-01',
      endDate: '2026-09-30',
      progress: 15,
      budget: 38500000000,
      spent: 5775000000,
      team: 62,
      description: 'Pembangunan fiber link Bandung-Cimahi via Jl. Baros'
    },
    stats: {
      fiberLength: 16800,
      equipment: 98,
      issues: 1
    },
    routes: [
      {
        id: 'span-bdg-cmh-01',
        name: 'BDG-CMH-01',
        stoFrom: 'STO Pasteur',
        stoTo: 'STO Cimahi',
        designator: 'HH2',
        color: '#A0522D',
        coordinates: [
          [107.5950, -6.8950],
          [107.5900, -6.8975],
          [107.5850, -6.9000],
          [107.5800, -6.9025],
          [107.5750, -6.9050],
          [107.5700, -6.9075],
          [107.5650, -6.9100],
          [107.5600, -6.9125],
          [107.5550, -6.9150],
          [107.5500, -6.9175],
          [107.5450, -6.9200]
        ],
        length: 6500,
        description: 'Route Pasteur-Cimahi via Jl. Baros - 11 designators'
      },
      {
        id: 'span-bdg-cmh-02',
        name: 'BDG-CMH-02',
        stoFrom: 'STO Cimahi',
        stoTo: 'STO Padalarang',
        designator: 'PS7',
        color: '#D2B48C',
        coordinates: [
          [107.5450, -6.9200],
          [107.5400, -6.9225],
          [107.5350, -6.9250],
          [107.5300, -6.9275],
          [107.5250, -6.9300],
          [107.5200, -6.9325],
          [107.5150, -6.9350],
          [107.5100, -6.9375],
          [107.5050, -6.9400],
          [107.5000, -6.9425]
        ],
        length: 5800,
        description: 'Route Cimahi-Padalarang - 10 designators'
      },
      {
        id: 'span-bdg-cmh-03',
        name: 'BDG-CMH-03',
        stoFrom: 'STO Padalarang',
        stoTo: 'STO Cikalong Wetan',
        designator: 'S3',
        color: '#8B7355',
        coordinates: [
          [107.5000, -6.9425],
          [107.4950, -6.9450],
          [107.4900, -6.9475],
          [107.4850, -6.9500],
          [107.4800, -6.9525],
          [107.4750, -6.9550],
          [107.4700, -6.9575],
          [107.4650, -6.9600]
        ],
        length: 4500,
        description: 'Route Padalarang-Cikalong Wetan - 8 designators'
      }
    ]
  },

  // 4. Medan - Deli Serdang Fiber
  {
    id: 'project-medan-deli-01',
    name: 'Medan - Deli Serdang Fiber Network',
    type: 'fiber',
    status: 'completed',
    location: {
      lat: 3.5952,
      lng: 98.6722,
      address: 'Medan - Deli Serdang',
      province: 'Sumatera Utara',
      city: 'Medan'
    },
    details: {
      contractor: 'PT Telkom Akses Sumut',
      startDate: '2025-08-01',
      endDate: '2026-01-31',
      progress: 100,
      budget: 42000000000,
      spent: 42000000000,
      team: 72,
      description: 'Pembangunan fiber network Medan-Deli Serdang via Jl. Gatot Subroto'
    },
    stats: {
      fiberLength: 14000,
      equipment: 95,
      issues: 0
    },
    routes: [
      {
        id: 'span-mdn-deli-01',
        name: 'MDN-DELI-01',
        stoFrom: 'STO Medan Kota',
        stoTo: 'STO Tanjung Morawa',
        designator: 'TC48',
        color: '#B8860B',
        coordinates: [
          [98.6722, 3.5952],
          [98.6800, 3.6000],
          [98.6880, 3.6050],
          [98.6960, 3.6100],
          [98.7040, 3.6150],
          [98.7120, 3.6200],
          [98.7200, 3.6250],
          [98.7280, 3.6300],
          [98.7360, 3.6350],
          [98.7440, 3.6400]
        ],
        length: 7200,
        description: 'Route Medan Kota-Tanjung Morawa via Jl. Gatot Subroto - 10 designators'
      },
      {
        id: 'span-mdn-deli-02',
        name: 'MDN-DELI-02',
        stoFrom: 'STO Tanjung Morawa',
        stoTo: 'STO Lubuk Pakam',
        designator: 'DA',
        color: '#DAA520',
        coordinates: [
          [98.7440, 3.6400],
          [98.7520, 3.6450],
          [98.7600, 3.6500],
          [98.7680, 3.6550],
          [98.7760, 3.6600],
          [98.7840, 3.6650],
          [98.7920, 3.6700],
          [98.8000, 3.6750],
          [98.8080, 3.6800],
          [98.8160, 3.6850]
        ],
        length: 6800,
        description: 'Route Tanjung Morawa-Lubuk Pakam - 10 designators'
      }
    ]
  }
];
