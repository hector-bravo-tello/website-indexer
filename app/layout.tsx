'use client';

import React, { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from '@/components/Navigation';
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
  const pathname = usePathname();
  const isSignInPage = pathname === '/auth/signin';

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
                {!isSignInPage && <Navigation />}
                {children}
                <ErrorHandler error={error} onClose={handleCloseError} />
              </ErrorBoundary>
            </ErrorContext.Provider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}