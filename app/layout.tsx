'use client';

import React, { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
  const pathname = usePathname();
  const isSignInPage = pathname === '/auth/signin';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
                  <Box sx={{ display: 'flex' }}>
                    <Navigation>
                      <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                      >
                        <MenuIcon />
                      </IconButton>
                    </Navigation>
                    <Box
                      component="nav"
                      sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}
                    >
                      <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                          keepMounted: true,
                        }}
                        sx={{
                          display: { xs: 'block', sm: 'none' },
                          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                        }}
                      >
                        <Sidebar open={mobileOpen} />
                      </Drawer>
                      <Drawer
                        variant="permanent"
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                        }}
                        open
                      >
                        <Sidebar open={true} />
                      </Drawer>
                    </Box>
                    <Box
                      component="main"
                      sx={{
                        flexGrow: 1,
                        p: 3,
                        width: { sm: `calc(100% - 240px)` },
                      }}
                    >
                      <Navigation.Offset />
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