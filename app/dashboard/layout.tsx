// app/dashboard/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import Navigation from '@/components/Navigation';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const pathname = usePathname();
  const isSignInPage = pathname === '/auth/signin';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarResize = (newWidth: number) => {
    setSidebarWidth(newWidth);
  };

  if (!mounted) {
    return null;
  }

  if (isSignInPage) {
    return children;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <Navigation sidebarWidth={sidebarWidth} onMenuClick={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sidebarWidth={sidebarWidth}
        onSidebarResize={handleSidebarResize}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${sidebarWidth}px)` },
          mt: '64px', // Offset for the AppBar (Navigation)
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}