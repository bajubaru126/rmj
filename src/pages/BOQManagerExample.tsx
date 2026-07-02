import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBOQModal, BOQFormData } from '@/components/modals/boqmanager/AddBOQModal';
import { EditBOQModal, BOQUpdateData } from '@/components/modals/boqmanager/EditBOQModal';
import { DeleteBOQModal } from '@/components/modals/boqmanager/DeleteBOQModal';
import { useBOQManager } from '@/hooks/useBOQManager';

interface BOQItem {
  id: string;
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

export function BOQManagerExample() {
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBOQ, setSelectedBOQ] = useState<BOQItem | null>(null);
  
  const { createBOQ, updateBOQ, deleteBOQ, isLoading } = useBOQManager();
  
  // Contoh project_id - ganti dengan project_id yang sebenarnya
  const currentProjectId = 'abc123';

  // Handler untuk Create BOQ
  const handleCreateBOQ = async (data: BOQFormData) => {
    try {
      const result = await createBOQ(data);
      
      // Update local state dengan data baru
      setBOQItems(prev => [...prev, { id: result.id || Date.now().toString(), ...data }]);
      
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error creating BOQ:', error);
    }
  };

  // Handler untuk Update BOQ
  const handleUpdateBOQ = async (data: BOQUpdateData) => {
    if (!selectedBOQ) return;
    
    try {
      await updateBOQ(selectedBOQ.id, data);
      
      // Update local state
      setBOQItems(prev => 
        prev.map(item => 
          item.id === selectedBOQ.id 
            ? { ...item, ...data }
            : item
        )
      );
      
      setIsEditModalOpen(false);
      setSelectedBOQ(null);
    } catch (error) {
      console.error('Error updating BOQ:', error);
    }
  };

  // Handler untuk Delete BOQ
  const handleDeleteBOQ = async () => {
    if (!selectedBOQ) return;
    
    try {
      await deleteBOQ(selectedBOQ.id);
      
      // Update local state
      setBOQItems(prev => prev.filter(item => item.id !== selectedBOQ.id));
      
      setIsDeleteModalOpen(false);
      setSelectedBOQ(null);
    } catch (error) {
      console.error('Error deleting BOQ:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">BOQ Manager</h1>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#005EB8] hover:bg-[#004a94]"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah BOQ
        </Button>
      </div>

      {/* Table BOQ Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uraian Pekerjaan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Satuan</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planned</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Harga</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {boqItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.designator}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.uraian_pekerjaan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.satuan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.planned.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  Rp {((item.harga_satuan_material + item.harga_satuan_jasa) * item.planned).toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBOQ(item);
                      setIsEditModalOpen(true);
                    }}
                    className="mr-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBOQ(item);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {boqItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Belum ada data BOQ. Klik "Tambah BOQ" untuk menambahkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddBOQModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateBOQ}
        projectId={currentProjectId}
      />

      <EditBOQModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBOQ(null);
        }}
        onSubmit={handleUpdateBOQ}
        boqData={selectedBOQ}
      />

      <DeleteBOQModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedBOQ(null);
        }}
        onConfirm={handleDeleteBOQ}
        boqData={selectedBOQ}
      />
    </div>
  );
}
