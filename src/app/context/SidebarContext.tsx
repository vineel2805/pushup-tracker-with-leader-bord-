import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  // On desktop: always open (no closed state). On mobile: can be closed
  const [isOpen, setIsOpen] = useState(false); // Start closed for mobile
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed (icon-only)

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };
  
  const openSidebar = () => {
    setIsOpen(true);
  };
  
  const closeSidebar = () => {
    setIsOpen(false);
  };
  
  const toggleCollapse = () => setIsCollapsed(prev => !prev);
  const expandSidebar = () => setIsCollapsed(false);
  const collapseSidebar = () => setIsCollapsed(true);

  return (
    <SidebarContext.Provider value={{ 
      isOpen, 
      isCollapsed,
      toggleSidebar, 
      openSidebar, 
      closeSidebar,
      toggleCollapse,
      expandSidebar,
      collapseSidebar
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

