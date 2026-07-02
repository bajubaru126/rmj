import { useState, useCallback } from 'react';
import { boqService } from '@/services/boqService';
import { toast } from 'sonner';

export interface BOQFormData {
  project_id: string;
  no: number;
  designator: string;
  uraian_pekerjaan: string;
  satuan: string;
  harga_satuan_material: number;
  harga_satuan_jasa: number;
  drm: number;
  planned: number;
  tambah: number;
  kurang: number;
}

export interface BOQUpdateData {
  no?: number;
  designator?: string;
  uraian_pekerjaan?: string;
  satuan?: string;
  harga_satuan_material?: number;
  harga_satuan_jasa?: number;
  drm?: number;
  planned?: number;
  tambah?: number;
  kurang?: number;
}

export function useBOQManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBOQ = useCallback(async (data: BOQFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await boqService.createBOQ(data);
      toast.success('BOQ berhasil ditambahkan!');
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal menambahkan BOQ';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBOQ = useCallback(async (id: string, data: BOQUpdateData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await boqService.updateBOQ(id, data);
      toast.success('BOQ berhasil diperbarui!');
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal memperbarui BOQ';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBOQ = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await boqService.deleteBOQ(id);
      toast.success('BOQ berhasil dihapus!');
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal menghapus BOQ';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createBOQ,
    updateBOQ,
    deleteBOQ,
    isLoading,
    error,
  };
}
