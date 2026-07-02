import { useState, useEffect } from 'react';
import { BOQData } from '@/types';
import { boqService } from '@/services/boqService';

export function useBOQ() {
  const [data, setData] = useState<BOQData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await boqService.getAllBOQ();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOQ data');
    } finally {
      setLoading(false);
    }
  };

  const createBOQ = async (boqData: Partial<BOQData>) => {
    try {
      const newBOQ = await boqService.createBOQ(boqData);
      setData(prev => [...prev, newBOQ]);
      return newBOQ;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create BOQ');
      throw err;
    }
  };

  const updateBOQ = async (id: string, boqData: Partial<BOQData>) => {
    try {
      const updated = await boqService.updateBOQ(id, boqData);
      if (updated) {
        setData(prev => prev.map(item => item.id === id ? updated : item));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update BOQ');
      throw err;
    }
  };

  const deleteBOQ = async (id: string) => {
    try {
      const success = await boqService.deleteBOQ(id);
      if (success) {
        setData(prev => prev.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete BOQ');
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: loadData,
    createBOQ,
    updateBOQ,
    deleteBOQ,
  };
}
