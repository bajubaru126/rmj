export interface BOQItem {
  id: string;
  designator: string;
  uraianPekerjaan: string;
  satuan: string;
  material: string;
  jasa: string;
  drm: string;
  actual: string;
  tambah: string;
  kurang: string;
  // keterangan: string;
}

export interface Contract {
  id: string;
  nomorKontrak: string;
  namaProject: string;
  contractSigned?: string;
  contractValue?: string;
  contractDuration?: string;
  startDatePlan?: string;
  endDatePlan?: string;
  location?: string;
  link?: string;
  lokasi: string;
  employeer?: string;
  mainVendor?: string;
  pelaksana: string;
  boqItems: BOQItem[];
  boqFileName: string;
  kmlFileName: string;
  kmlFileContent: string;
  spans: string[];
  spanObjects?: Array<{id: string, name: string}>; // Full span objects with ID
  createdAt: string;
}

// LocalStorage helper functions
const STORAGE_KEY = 'rmj_contracts';

export const getContractsFromStorage = (): Contract[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

export const saveContractsToStorage = (contracts: Contract[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};
