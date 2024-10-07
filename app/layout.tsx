// Filename: app/layout.tsx

'use client';

import React, { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import Navigation from '@/components/Navigation';
import Sidebar from '@/components/Sidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorHandler from '@/components/ErrorHandler';
import { usePathname } from 'next/navigation';
import theme from '@/lib/theme';
import { ErrorContext } from '@/lib/ErrorContext';

export interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240); // Initial sidebar width
  const pathname = usePathname();
  const isSignInPage = pathname === '/auth/signin';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarResize = (newWidth: number) => {
    setSidebarWidth(newWidth);
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ErrorContext.Provider value={{ setError }}>
              <ErrorBoundary>
                {!isSignInPage && (
                  <Box sx={{ display: 'flex', height: '100vh' }}>
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
                      }}
                    >
                      {children}
                    </Box>
                  </Box>
                )}
                {isSignInPage && children}
                <ErrorHandler error={error} onClose={handleCloseError} />
              </ErrorBoundary>
            </ErrorContext.Provider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
