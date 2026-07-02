// BA Survey Local Storage Utility (Frontend-only for demo)
// This is a temporary solution until backend finalize endpoint is implemented

export interface LocalBADrmItem {
  id: string;
  project_id: string;
  link_id: string;
  lokasi: string;
  tanggal: string;
  created_at: string;
  created_by: string;
  documents: {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    keterangan: string;
    status: string;
    created_at: string;
  }[];
}

const STORAGE_KEY = 'ba_drm_finalized_surveys';

/**
 * Get all finalized BA Surveys from localStorage
 */
export function getLocalBADrm(): LocalBADrmItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading BA DRM from localStorage:', error);
    return [];
  }
}

/**
 * Get finalized BA Surveys by project_id
 */
export function getLocalBADrmByProject(projectId: string): LocalBADrmItem[] {
  const allItems = getLocalBADrm();
  return allItems.filter(item => item.project_id === projectId);
}

/**
 * Get finalized BA Surveys by link_id
 */
export function getLocalBADrmByLink(linkId: string): LocalBADrmItem[] {
  const allItems = getLocalBADrm();
  return allItems.filter(item => item.link_id === linkId);
}

/**
 * Get finalized BA Survey by ID
 */
export function getLocalBADrmById(id: string): LocalBADrmItem | null {
  const allItems = getLocalBADrm();
  return allItems.find(item => item.id === id) || null;
}

/**
 * Add/Update finalized BA Survey
 */
export function saveLocalBADrm(item: LocalBADrmItem): void {
  try {
    const allItems = getLocalBADrm();
    const existingIndex = allItems.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      // Update existing
      allItems[existingIndex] = item;
    } else {
      // Add new
      allItems.push(item);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allItems));
    console.log('✅ BA DRM saved to localStorage:', item.id);
  } catch (error) {
    console.error('Error saving BA DRM to localStorage:', error);
    throw error;
  }
}

/**
 * Delete finalized BA Survey
 */
export function deleteLocalBADrm(id: string): void {
  try {
    const allItems = getLocalBADrm();
    const filtered = allItems.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('✅ BA DRM deleted from localStorage:', id);
  } catch (error) {
    console.error('Error deleting BA DRM from localStorage:', error);
    throw error;
  }
}

/**
 * Check if a survey is already finalized
 */
export function isSurveyFinalized(surveyId: string): boolean {
  const allItems = getLocalBADrm();
  return allItems.some(item => item.id === surveyId);
}

/**
 * Clear all finalized BA Surveys (for testing)
 */
export function clearLocalBADrm(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('✅ All BA DRM cleared from localStorage');
}
