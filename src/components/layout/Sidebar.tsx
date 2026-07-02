import { ChevronDown, LogOut, Mail, Network, Database, Home, FolderOpen, Map as MapIcon, Scan, FileSpreadsheet, Wrench, Archive, Settings, Route } from 'lucide-react';
import { useState, useRef, useEffect, ElementType } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  onLogout?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
  roles?: string[];
  badge?: string;
  badgeRed?: boolean;
}

const NAV_OVERVIEW: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'pm'] },
  { id: 'dashboard-map', label: 'Network Map', icon: MapIcon, roles: ['admin', 'pm'] },
];

const NAV_PROJECT: NavItem[] = [
  { id: 'project', label: 'Semua Project', icon: FolderOpen, roles: ['admin', 'pm'] },
  { id: 'semua-ruas', label: 'Semua Ruas', icon: Route, roles: ['admin', 'pm'] },
];

const NAV_MONITOR: NavItem[] = [
  { id: 'survey', label: 'Survey', icon: Scan, roles: ['admin', 'pm', 'pm_mitra', 'pm_waspang', 'teknisi_lapangan', 'surveyor'], badge: '4' },
  { id: 'drm', label: 'DRM', icon: FileSpreadsheet, roles: ['admin', 'pm'], badge: '2', badgeRed: true },
  { id: 'installation', label: 'Instalasi', icon: Wrench, roles: ['admin', 'pm'] },
];

const NAV_OTHER: NavItem[] = [
  { id: 'repository', label: 'Repository', icon: Archive, roles: ['admin', 'pm'] },
  { id: 'configuration', label: 'Settings', icon: Settings, roles: ['admin', 'pm'] },
];

function NavSection({ label, items, activeTab, onTabChange }: {
  label: string;
  items: NavItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-4 pt-3 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-left" style={{ color: '#4B5563' }}>
        {label}
      </p>
      {items.map((item) => {
        const active = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange?.(item.id)}
            className={`sb-item group relative flex items-center gap-2.5 px-4 py-2 w-full font-medium transition-colors text-left ${
              active ? 'sb-item-active' : 'sb-item-inactive'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#EF4444]" />
            )}
            <Icon className={`h-[15px] w-[15px] shrink-0 transition-colors ${
              active ? 'text-[#EF4444]' : 'text-white/35 group-hover:text-white/60'
            }`} />
            <span className={`flex-1 truncate text-[12.5px] ${active ? 'text-white' : ''}`}>
              {item.label}
            </span>
            {item.badge && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
                item.badgeRed
                  ? 'bg-[#3B1111] text-[#EF4444]'
                  : 'bg-white/8 text-white/45'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({ onLogout, activeTab, onTabChange }: SidebarProps) {
  const { user, logout: authLogout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    if (onLogout) {
      onLogout();
    } else {
      authLogout();
    }
  };

  const userName = user?.username || (user?.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'User');
  const userEmail = user?.email || '';

  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'User';
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teknisi_lapangan':
      case 'surveyor': return 'Surveyor';
      case 'pm': return 'Project Manager';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const userRoleDisplay = getRoleDisplayName(user?.role);
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Filter items by role
  const filterByRole = (items: NavItem[]) =>
    items.filter(item => {
      if (!item.roles || item.roles.length === 0) return true;
      return user?.role && item.roles.includes(user.role);
    });

  return (
    <aside className="sidebar-nav flex flex-col h-full shrink-0 w-[240px] text-left">
      {/* Brand / Logo */}
      <div className="flex h-14 shrink-0 items-center px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EF4444] text-sm font-black text-white">
            R
          </div>
          <div className="leading-none">
            <p className="text-[14px] font-bold tracking-tight text-white">BaRcodes</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">Telkom Infra</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 overflow-y-auto items-stretch text-left">
        <NavSection label="Overview" items={filterByRole(NAV_OVERVIEW)} activeTab={activeTab} onTabChange={onTabChange} />
        <NavSection label="Project & Ruas" items={filterByRole(NAV_PROJECT)} activeTab={activeTab} onTabChange={onTabChange} />
        <NavSection label="Workflow Monitor" items={filterByRole(NAV_MONITOR)} activeTab={activeTab} onTabChange={onTabChange} />
        <NavSection label="Lainnya" items={filterByRole(NAV_OTHER)} activeTab={activeTab} onTabChange={onTabChange} />
      </nav>

      {/* User Block */}
      <div className="p-3 relative shrink-0 mt-auto" ref={dropdownRef}>
        {/* Profile Dropdown (opens upward) */}
        {showProfileDropdown && (
          <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#131720] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] z-[9999] backdrop-blur-xl">
            <p className="px-3.5 py-2 text-[9px] uppercase tracking-[0.12em] text-white/25 font-medium">
              Account
            </p>
            <div className="px-3.5 pb-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="sb-avatar w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-lg">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-white/90">{userName}</p>
                  <p className="truncate text-[9px] uppercase tracking-[0.1em] text-white/30 mt-0.5">{userRoleDisplay}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.04] rounded-lg text-[11px] text-white/40 border border-white/[0.04]">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-white/30" />
                <span className="truncate">{userEmail}</span>
              </div>
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg transition-all group shadow-lg shadow-red-900/20"
              >
                <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* User trigger */}
        <button
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <div className="sb-avatar w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{userName}</p>
            <p className="truncate text-[9.5px] uppercase tracking-wider text-white/35">{userRoleDisplay}</p>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
