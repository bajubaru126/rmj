import { Home, FolderOpen, Map as MapIcon, Camera, FileSpreadsheet, Wrench, Database, Settings, Network } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: any;
  roles?: string[]; // Allowed roles for this tab. If undefined, accessible to all roles
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'pm'] },
  { id: 'dashboard-map', label: 'Dashboard Map', icon: MapIcon, roles: ['admin', 'pm'] },
  { id: 'project', label: 'Project', icon: FolderOpen, roles: ['admin', 'pm'] },
  { id: 'survey', label: 'Survey', icon: Camera, roles: ['admin', 'pm', 'pm_mitra', 'pm_waspang', 'teknisi_lapangan', 'surveyor'] }, // Accessible by admin, pm and surveyor
  { id: 'drm', label: 'DRM', icon: FileSpreadsheet, roles: ['admin', 'pm'] },
  // { id: 'material', label: 'Material', icon: Package }, // Hidden as requested
  { id: 'installation', label: 'Installation', icon: Wrench, roles: ['admin', 'pm'] },
  // { id: 'risks', label: 'Risks', icon: AlertTriangle }, // Hidden as requested
  { id: 'repository', label: 'Repository', icon: Database, roles: ['admin', 'pm'] },
  { id: 'configuration', label: 'Configuration', icon: Settings, roles: ['admin', 'pm'] },
  { id: 'hierarchy', label: 'KKP OSP', icon: Network, roles: ['admin', 'pm'] },
  // Designator and Designator Package moved to Configuration sub-tab
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { user } = useAuth();
  
  // Debug: Log user role
  console.log('🔍 TabNavigation - User:', user);
  console.log('🔍 TabNavigation - User role:', user?.role);
  
  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => {
    // If no roles specified, tab is accessible to all
    if (!tab.roles || tab.roles.length === 0) {
      return true;
    }
    
    // Check if user's role is in the allowed roles for this tab
    return user?.role && tab.roles.includes(user.role);
  });
  
  console.log('🔍 TabNavigation - Visible tabs:', visibleTabs.map(t => t.id));

  return (
    <div className="bg-white border-b border-gray-200 px-6 overflow-x-auto" style={{ height: '48px' }}>
      <div className="flex items-center h-full gap-1 min-w-max">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors ${
                isActive
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
