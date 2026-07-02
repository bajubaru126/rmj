import { useState, useEffect } from 'react';
import { Attribute, AttributeFormData } from '@/types';
import { attributeService } from '@/services/attributeService';

export function useAttributes() {
  const [data, setData] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await attributeService.getAllAttributes();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const createAttribute = async (attrData: AttributeFormData) => {
    try {
      const newAttr = await attributeService.createAttribute(attrData);
      setData(prev => [...prev, newAttr]);
      return newAttr;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create attribute');
      throw err;
    }
  };

  const updateAttribute = async (id: string, attrData: Partial<AttributeFormData>) => {
    try {
      const updated = await attributeService.updateAttribute(id, attrData);
      if (updated) {
        setData(prev => prev.map(item => item.id === id ? updated : item));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attribute');
      throw err;
    }
  };

  const deleteAttribute = async (id: string) => {
    try {
      const success = await attributeService.deleteAttribute(id);
      if (success) {
        setData(prev => prev.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attribute');
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: loadData,
    createAttribute,
    updateAttribute,
    deleteAttribute,
  };
}
