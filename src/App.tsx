import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { FilterBar } from './components/shared/FilterBar';
import { ActionBar } from './components/layout/ActionBar';
import { OrbitProgress } from 'react-loading-indicators';
import { Dashboard } from './pages/Dashboard';
import { DashboardMap } from './pages/DashboardMap';
import { KontrakExplorer } from './pages/KontrakExplorer';
import { SemuaRuas } from './pages/SemuaRuas';
import { RuasDetail } from './pages/RuasDetail';
import { Survey } from './pages/Survey';
import { DRM } from './pages/DRM';
import { Material } from './pages/Material';
import { Installation } from './pages/Installation';
import { Hierarchy } from './pages/Hierarchy';
import { Repository } from './pages/Repository';
import { Configuration } from './pages/Configuration';
import { RMJTable } from './components/shared/RMJTable';
import { AttributeBuilder } from './pages/AttributeBuilder';
import { ImportExport } from './pages/ImportExport';
import { UserManagement } from './pages/UserManagement';
import { Risks } from './pages/Risks';
import { LoginForm } from './components/shared/LoginForm';
import { RegisterForm } from './components/shared/RegisterForm';
import { AddAttributeModal } from './components/modals/attribute/AddAttributeModal';
import { TokenExpiredModal } from './components/shared/TokenExpiredModal';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useTokenExpiration } from './hooks/useTokenExpiration';
import { FilterProvider } from './context/FilterContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { useAttributes } from './hooks/useAttributes';
import { AttributeFormData } from './types';
import { setupApiInterceptor } from './utils/apiInterceptor';
import { Toaster } from 'sonner';

function AppContent() {
  const { isLoggedIn, logout, isLoading, user } = useAuth();
  const { modalState, openModal, closeModal } = useModal();
  const { createAttribute } = useAttributes();

  // Token expiration handling
  const { showExpiredModal, handleLogout: handleTokenExpiredLogout, countdownTime } = useTokenExpiration({
    checkInterval: 30000, // Check every 30 seconds
    warningTime: 60000, // Show warning 60 seconds before expiration
    countdownTime: 10 // 10 second countdown
  });

  // Load active tab from localStorage on mount, default based on user role
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'dashboard';
  });
  const [showAttributeBuilder, setShowAttributeBuilder] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Set initial tab based on user role when user data is loaded
  useEffect(() => {
    console.log('🔍 App - User role changed:', user?.role);
    if (user?.role === 'teknisi_lapangan' || user?.role === 'surveyor' || user?.role === 'pm_mitra' || user?.role === 'pm_waspang') {
      console.log('🔍 App - Setting activeTab to survey for surveyor');
      setActiveTab('survey');
    }
  }, [user?.role]);

  // Save active tab to localStorage whenever it changes (except for surveyor)
  useEffect(() => {
    console.log('🔍 App - Active tab changed to:', activeTab);
    // Don't save tab preference for surveyor since they should always see survey
    if (user?.role !== 'teknisi_lapangan' && user?.role !== 'surveyor' && user?.role !== 'pm_mitra' && user?.role !== 'pm_waspang') {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, user?.role]);

  // Redirect surveyor to survey tab if they try to access other tabs
  useEffect(() => {
    if ((user?.role === 'teknisi_lapangan' || user?.role === 'surveyor' || user?.role === 'pm_mitra' || user?.role === 'pm_waspang') && activeTab !== 'survey') {
      setActiveTab('survey');
    }
  }, [user?.role, activeTab]);

  // Setup API interceptor on mount
  useEffect(() => {
    setupApiInterceptor();

    // Cleanup on unmount
    return () => {
      // Note: We don't restore original fetch here as it might be used by other parts
      // The interceptor is designed to be safe and only trigger events for authenticated requests
    };
  }, []);

  const [attributeFormData, setAttributeFormData] = useState<AttributeFormData>({
    name: '',
    label: '',
    type: 'text',
    category: 'main',
    level: 0,
    required: false,
    defaultValue: '',
    options: []
  });

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    localStorage.removeItem('activeTab'); // Clear saved tab on logout
  };

  const handleAddAttributeSubmit = async () => {
    try {
      await createAttribute(attributeFormData);
      closeModal('isAddAttributeModalOpen');
      // Reset form
      setAttributeFormData({
        name: '',
        label: '',
        type: 'text',
        category: 'main',
        level: 0,
        required: false,
        defaultValue: '',
        options: []
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleAddAttributeCancel = () => {
    closeModal('isAddAttributeModalOpen');
    // Reset form
    setAttributeFormData({
      name: '',
      label: '',
      type: 'text',
      category: 'main',
      level: 0,
      required: false,
      defaultValue: '',
      options: []
    });
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
      </div>
    );
  }

  // Show login or register form if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'attribute') {
      setShowAttributeBuilder(true);
    } else if (tab === 'import') {
      setShowImportExport(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleTabChange} />;
      case 'dashboard-map':
        return <DashboardMap />;
      case 'project':
        return <div className="h-full"><KontrakExplorer /></div>;
      case 'semua-ruas':
        return <SemuaRuas onTabChange={handleTabChange} />;
      case 'ruas-detail': {
        const raw = localStorage.getItem('ruasDetailParams');
        const params = raw ? JSON.parse(raw) : null;
        if (params) {
          return <RuasDetail
            linkId={params.linkId}
            projectId={params.projectId}
            projectName={params.projectName}
            linkName={params.linkName}
            initialStage={params.initialStage || 'survey'}
            onBack={() => handleTabChange(params.originTab || 'survey')}
          />;
        }
        return <Survey />;
      }
      case 'survey':
        return <Survey onTabChange={handleTabChange} />;
      case 'drm':
        return <DRM onTabChange={handleTabChange} />;
      case 'material':
        return <Material />;
      case 'installation':
        return <Installation onTabChange={handleTabChange} />;
      case 'hierarchy':
        return <Hierarchy />;
      case 'repository':
        return <Repository />;
      case 'configuration':
        return <Configuration />;
      case 'user-management':
        return <UserManagement />;
      case 'risks':
        return <Risks />;
      default:
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <FilterBar />
            <ActionBar
              selectedCount={selectedRows.length}
              onAttributeBuilder={() => setShowAttributeBuilder(true)}
              onAddAttributeModal={() => openModal('isAddAttributeModalOpen')}
            />
            <div className="flex-1 overflow-auto">
              <RMJTable
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">{/* Main container: sidebar + content */}
      <Toaster position="top-right" richColors />

      {/* Left Sidebar */}
      <Sidebar onLogout={handleLogout} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader />

        {/* Main Content Area */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-4 min-w-0 overflow-y-auto overflow-x-hidden">
            {renderContent()}
          </div>

          {/* Attribute Builder Slide-out */}
          {showAttributeBuilder && (
            <AttributeBuilder onClose={() => setShowAttributeBuilder(false)} />
          )}
        </div>
      </div>

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExport onClose={() => setShowImportExport(false)} />
      )}

      {/* Add Attribute Modal */}
      <AddAttributeModal
        open={modalState.isAddAttributeModalOpen}
        onOpenChange={(open) => open ? openModal('isAddAttributeModalOpen') : closeModal('isAddAttributeModalOpen')}
        formData={attributeFormData}
        onFormDataChange={setAttributeFormData}
        onSubmit={handleAddAttributeSubmit}
        onCancel={handleAddAttributeCancel}
      />

      {/* Token Expired Modal */}
      <TokenExpiredModal
        isOpen={showExpiredModal}
        onLogout={handleTokenExpiredLogout}
        countdownSeconds={countdownTime}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <ModalProvider>
            <Routes>
              <Route path="/" element={<LoginRoute />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/register" element={<RegisterRoute />} />
              <Route path="/dashboard/*" element={<AppContent />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ModalProvider>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Login Route Component
function LoginRoute() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginForm onLoginSuccess={() => { }} onSwitchToRegister={() => window.location.href = '/register'} />;
}

// Register Route Component
function RegisterRoute() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <RegisterForm onRegisterSuccess={() => { }} onSwitchToLogin={() => window.location.href = '/login'} />;
}