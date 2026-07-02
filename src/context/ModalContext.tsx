import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalState {
  isAddAttributeModalOpen: boolean;
  isAddRuasModalOpen: boolean;
  isUploadDRMModalOpen: boolean;
  isUploadKMLModalOpen: boolean;
  isAddIssueModalOpen: boolean;
  isEditIssueModalOpen: boolean;
  isDeleteIssueModalOpen: boolean;
}

interface ModalContextType {
  modalState: ModalState;
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
  closeAllModals: () => void;
}

const defaultModalState: ModalState = {
  isAddAttributeModalOpen: false,
  isAddRuasModalOpen: false,
  isUploadDRMModalOpen: false,
  isUploadKMLModalOpen: false,
  isAddIssueModalOpen: false,
  isEditIssueModalOpen: false,
  isDeleteIssueModalOpen: false,
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>(defaultModalState);

  const openModal = (modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: false }));
  };

  const closeAllModals = () => {
    setModalState(defaultModalState);
  };

  return (
    <ModalContext.Provider value={{ modalState, openModal, closeModal, closeAllModals }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
