import { useState } from 'react';
import { Settings, Users, Package, Activity, Building2, UserCheck, PackageCheck } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { VendorManagement } from './VendorManagement';
import { DesignatorManagement } from './DesignatorManagement';
import { DesignatorPackage } from './DesignatorPackage';
import { AssignSurveyor } from './AssignSurveyor';
import { BOQPaketManagement } from './BOQPaketManagement';
import { useAuth } from '@/hooks/useAuth';

export function Configuration() {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'users' | 'vendors' | 'designators' | 'designator-package' | 'assign-surveyor' | 'boq-paket'>('settings');
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30 relative">
      {/* Background Decorative Elements */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Configuration</h2>
        
        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeSubTab === 'settings'
                ? 'border-[#005EB8] text-[#005EB8]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('users')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'users'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">User Management</span>
            </button>
          )}
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('vendors')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'vendors'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Vendor Management</span>
            </button>
          )}
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('designators')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'designators'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">Designator</span>
            </button>
          )}
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('designator-package')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'designator-package'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Designator Package</span>
            </button>
          )}
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('assign-surveyor')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'assign-surveyor'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Assign Surveyor</span>
            </button>
          )}
          
          {user && 'role' in user && (user.role === 'admin' || user.role === 'pm') && (
            <button
              onClick={() => setActiveSubTab('boq-paket')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeSubTab === 'boq-paket'
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span className="text-sm font-medium">BOQ Paket</span>
            </button>
          )}
        </div>

        {/* Content based on active sub-tab */}
        {activeSubTab === 'settings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-4">User Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue="Tegar" 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input 
                    type="email" 
                    defaultValue="tegar@telkomen.id" 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                  <input 
                    type="text" 
                    defaultValue="Project Manager" 
                    disabled 
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500"
                  />
                </div>
                <button className="liquid-btn w-full px-4 py-2 bg-gradient-to-r from-[#15396C] to-[#0078D7] text-white rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all">
                  Save Changes
                </button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-4">System Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Notifications</span>
                  <div className="w-10 h-6 bg-cyan-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Dark Mode</span>
                  <div className="w-10 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'users' ? (
          <UserManagement />
        ) : activeSubTab === 'vendors' ? (
          <VendorManagement />
        ) : activeSubTab === 'designators' ? (
          <DesignatorManagement />
        ) : activeSubTab === 'designator-package' ? (
          <DesignatorPackage />
        ) : activeSubTab === 'assign-surveyor' ? (
          <AssignSurveyor />
        ) : activeSubTab === 'boq-paket' ? (
          <BOQPaketManagement />
        ) : null}
      </div>
    </div>
  );
}
