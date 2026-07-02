import { useState, useEffect } from 'react';
import { 
  createProject, 
  getAllProjects, 
  getProjectById,
  updateProject,
  deleteProject,
  ProjectResponse,
  CreateProjectRequest,
  extractId
} from '@/services/contractService';
import { useAuth } from './useAuth';

export const useContract = () => {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all contracts from backend
   */
  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching all projects from API...');
      const data = await getAllProjects(token);
      console.log('✅ Received', data.length, 'projects from API');
      
      // Note: GET /projects does NOT include boq_planned (only basic info)
      // Use fetchContractById() to get full project detail with boq_planned
      
      setContracts(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch contracts';
      setError(errorMsg);
      console.error('Error fetching contracts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch single contract by ID
   * ✅ This includes boq_planned data in response (from new API)
   * @param id - Contract ID to fetch
   * @param shouldUpdate - Optional callback to check if state should be updated (for race condition prevention)
   */
  const fetchContractById = async (id: string, shouldUpdate?: () => boolean) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching project by ID:', id);
      const data = await getProjectById(id, token);
      console.log('✅ Received project detail:', data.name);
      console.log('  📦 boq_planned items:', data.boq_planned?.length || 0);
      console.log('  📄 boq_documents:', data.boq_documents?.length || 0);
      console.log('  🗺️  kml_documents:', data.kml_documents?.length || 0);
      
      if (data.boq_planned && data.boq_planned.length > 0) {
        console.log('  📊 First BOQ item:', {
          no: data.boq_planned[0].no,
          designator: data.boq_planned[0].designator,
          uraian: data.boq_planned[0].uraian_pekerjaan?.substring(0, 50)
        });
      }
      
      // Check if we should still update state (race condition check)
      if (shouldUpdate && !shouldUpdate()) {
        console.log('⚠️ Skipping state update - request is stale');
        return data;
      }
      
      // Update the contract in the contracts array with the fetched detail
      setContracts(prev => {
        const existingIndex = prev.findIndex(c => extractId(c.id) === id);
        if (existingIndex >= 0) {
          // Update existing contract
          const updated = [...prev];
          updated[existingIndex] = data;
          console.log('  ✅ Updated existing contract in state');
          return updated;
        } else {
          // Add new contract
          console.log('  ➕ Added new contract to state');
          return [...prev, data];
        }
      });
      
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch contract';
      setError(errorMsg);
      console.error('Error fetching contract:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create new contract
   */
  const createContract = async (data: CreateProjectRequest) => {
    setLoading(true);
    setError(null);
    try {
      const newContract = await createProject(data, token);
      setContracts(prev => [...prev, newContract]);
      return newContract;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create contract';
      setError(errorMsg);
      console.error('Error creating contract:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing contract
   */
  const updateContract = async (id: string, data: Partial<CreateProjectRequest>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateProject(id, data, token);
      setContracts(prev => 
        prev.map(c => {
          const cId = extractId(c.id);
          const targetId = extractId(id);
          return cId === targetId ? updated : c;
        })
      );
      return updated;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update contract';
      setError(errorMsg);
      console.error('Error updating contract:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete contract
   */
  const removeContract = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteProject(id, token);
      setContracts(prev => 
        prev.filter(c => {
          const cId = extractId(c.id);
          const targetId = extractId(id);
          return cId !== targetId;
        })
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete contract';
      setError(errorMsg);
      console.error('Error deleting contract:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount ONLY if user is logged in (has token)
  // Use empty dependency array to run only once on mount
  useEffect(() => {
    const currentToken = token;
    if (currentToken) {
      console.log('✅ Token found, fetching contracts...');
      fetchContracts();
    } else {
      console.log('ℹ️ No token, skipping auto-fetch');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    fetchContractById,
    createContract,
    updateContract,
    removeContract,
  };
};
