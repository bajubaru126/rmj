import { useState, useEffect } from 'react';
import { RuasData } from '@/types';
import { ruasService } from '@/services/ruasService';

export function useRuasData() {
  const [data, setData] = useState<RuasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await ruasService.getAllRuas();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ruas data');
    } finally {
      setLoading(false);
    }
  };

  const createRuas = async (ruasData: Partial<RuasData>) => {
    try {
      const newRuas = await ruasService.createRuas(ruasData);
      setData(prev => [...prev, newRuas]);
      return newRuas;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ruas');
      throw err;
    }
  };

  const updateRuas = async (id: string, ruasData: Partial<RuasData>) => {
    try {
      const updated = await ruasService.updateRuas(id, ruasData);
      if (updated) {
        setData(prev => prev.map(item => item.id === id ? updated : item));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ruas');
      throw err;
    }
  };

  const deleteRuas = async (id: string) => {
    try {
      const success = await ruasService.deleteRuas(id);
      if (success) {
        setData(prev => prev.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ruas');
      throw err;
    }
  };

  const uploadDRM = async (ruasId: string, file: File) => {
    try {
      return await ruasService.uploadDRM(ruasId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload DRM');
      throw err;
    }
  };

  const uploadKML = async (cellId: string, file: File, description?: string) => {
    try {
      return await ruasService.uploadKML(cellId, file, description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload KML');
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: loadData,
    createRuas,
    updateRuas,
    deleteRuas,
    uploadDRM,
    uploadKML,
  };
}
