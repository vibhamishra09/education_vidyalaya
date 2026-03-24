import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  pathname: string;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setPathname: (path: string) => void;
  navigateTo: (path: string) => void;
  setNavigateFunction: (fn: (path: string) => void) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pathname, setPathname] = useState('/');
  const navigateFnRef = useRef<((path: string) => void) | null>(null);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen(prev => !prev);
  
  const navigateTo = useCallback((path: string) => {
    if (navigateFnRef.current) {
      navigateFnRef.current(path);
    }
  }, []);

  const setNavigateFunction = useCallback((fn: (path: string) => void) => {
    navigateFnRef.current = fn;
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      isOpen, 
      pathname, 
      openSidebar, 
      closeSidebar, 
      toggleSidebar, 
      setPathname,
      navigateTo,
      setNavigateFunction
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
