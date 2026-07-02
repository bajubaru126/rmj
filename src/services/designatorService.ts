import { API_ENDPOINTS, apiFetch } from '@/config/api';

export interface DesignatorId {
  tb: string;
  id: {
    String: string;
  };
}

export interface Designator {
  id: DesignatorId;
  name: string;
  created_at: string;
  created_by: DesignatorId;
}

export interface DesignatorV2 {
  id: DesignatorId;
  no: number;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  created_at: string;
  created_by: DesignatorId;
}

export interface Category {
  category: string;
}

export interface SubCategory {
  sub_category: string;
}

/**
 * Get all designators
 */
export const getAllDesignators = async (): Promise<Designator[]> => {
  return apiFetch<Designator[]>('/designators', {
    method: 'GET',
  });
};

/**
 * Get all designators v2 with optional filters
 */
export const getAllDesignatorsV2 = async (
  category?: string,
  subCategory?: string
): Promise<DesignatorV2[]> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (subCategory) params.append('sub_category', subCategory);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/designators-v2?${queryString}` : '/designators-v2';
  
  return apiFetch<DesignatorV2[]>(endpoint, {
    method: 'GET',
  });
};

/**
 * Get all categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
  return apiFetch<Category[]>('/categories', {
    method: 'GET',
  });
};

/**
 * Get sub categories by category
 */
export const getSubCategoriesByCategory = async (category: string): Promise<SubCategory[]> => {
  return apiFetch<SubCategory[]>(`/categories/${encodeURIComponent(category)}/sub-categories`, {
    method: 'GET',
  });
};

/**
 * Extract designator name from Designator object
 */
export const extractDesignatorName = (designator: Designator): string => {
  return designator.name;
};
