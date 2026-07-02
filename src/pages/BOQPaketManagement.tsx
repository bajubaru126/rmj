import { TabBOQPackage } from '@/components/kontrak/TabBOQPackage';

export function BOQPaketManagement() {
  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
      <TabBOQPackage />
    </div>
  );
}
