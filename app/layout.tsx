// app/layout.tsx
'use client';

import React, { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { 
  Grid,
  AppBar, 
  Toolbar, 
  Button, 
  Container, 
  Typography, 
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { ErrorContext } from '@/lib/ErrorContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorHandler from '@/components/ErrorHandler';
import Link from 'next/link';
import Image from 'next/image';
import theme from '@/lib/theme';
import { usePathname } from 'next/navigation';

export interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  //const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();

  const handleCloseError = () => {
    setError(null);
  };

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const menuItems = [
    { text: 'Home', href: '/' },
    { text: 'Features', href: '#features' },
    { text: 'Benefits', href: '#benefits' },
    { text: 'Sign In', href: '/auth/signin' }
  ];

  // Check if we're in the dashboard section
  const isDashboard = pathname.startsWith('/dashboard');
  // Check if we're on the sign-in page
  const isSignIn = pathname === '/auth/signin';

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider theme={useTheme()}>
            <CssBaseline />
            <ErrorContext.Provider value={{ setError }}>
              <ErrorBoundary>
                {!isDashboard && !isSignIn && (
                  // Home page layout
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    {/* Home Navigation */}
                    <AppBar position="fixed">
                      <Container maxWidth="lg">
                        <Toolbar disableGutters sx={{ 
                          justifyContent: 'space-between',
                          minHeight: { xs: 56, sm: 64 } 
                        }}>
                          {isMobile && (
                            <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer(true)}>
                              <MenuIcon />
                            </IconButton>
                          )}
                          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: isMobile ? 'center' : 'left', alignItems: 'center' }}>
                            <Link href="/" passHref>
                              <Image
                                src="/images/logo.png"
                                alt="Logo"
                                width={isMobile ? 140 : 190}
                                height={isMobile ? 30 : 40}
                                priority
                                style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                              />
                            </Link>
                          </Box>
                          {!isMobile && (
                            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                              {menuItems.map((item) => (
                                item.text === 'Sign In' ? (
                                  <Link
                                    key={item.text}
                                    href={item.href}
                                    style={{ textDecoration: 'none' }}>
                                    <Button 
                                      variant="outlined" 
                                      sx={{ 
                                        color: 'white', 
                                        borderColor: 'white',
                                        '&:hover': {
                                          backgroundColor: 'white',
                                          color: theme.palette.primary.main,
                                        }
                                      }}
                                    >
                                      {item.text}
                                    </Button>
                                  </Link>
                                ) : (
                                  <Link
                                    key={item.text}
                                    href={item.href}
                                    style={{ textDecoration: 'none' }}>
                                    <Typography sx={{ color: 'white' }}>
                                      {item.text}
                                    </Typography>
                                  </Link>
                                )
                              ))}
                            </Box>
                          )}
                        </Toolbar>
                      </Container>
                    </AppBar>

                    {/* Mobile Drawer */}
                    <Drawer 
                      anchor="left" 
                      open={drawerOpen} 
                      onClose={toggleDrawer(false)}
                      sx={{ '& .MuiDrawer-paper': { bgcolor: theme.palette.primary.dark, color: 'white' } }}
                    >
                      <Box sx={{ width: 250 }}>
                        <IconButton onClick={toggleDrawer(false)} sx={{ color: 'white' }}>
                          <CloseIcon />
                        </IconButton>
                        <List>
                          {menuItems.map((item) => (
                            <ListItem key={item.text} onClick={toggleDrawer(false)} component="div">
                              <Link href={item.href} passHref>
                                <ListItemText primary={item.text} sx={{ '& .MuiTypography-root': { color: 'white' } }} />
                              </Link>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Drawer>

                    {/* Main Content */}
                    <Box component="main" sx={{ flex: 1, mt: { xs: '56px', sm: '64px' } }}>
                      {children}
                    </Box>

                    {/* Footer */}
                    <Box sx={{ 
                      bgcolor: theme.palette.primary.dark, 
                      color: 'white', 
                      py: { xs: 3, sm: 4 },
                      px: 2
                    }}>
                      <Container maxWidth="lg">
                        <Grid container spacing={2} justifyContent="space-between" alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 3,
                              justifyContent: { xs: 'center', sm: 'flex-start' },
                              mb: { xs: 2, sm: 0 }
                            }}>
                              {['Home', 'Features', 'Benefits'].map((text) => (
                                <Link
                                  key={text}
                                  href={text === 'Home' ? '/' : `#${text.toLowerCase()}`}
                                  style={{ textDecoration: 'none' }}>
                                  <Typography sx={{ color: 'white' }}>
                                    {text}
                                  </Typography>
                                </Link>
                              ))}
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 2,
                              justifyContent: { xs: 'center', sm: 'flex-end' }
                            }}>
                              {['facebook', 'twitter', 'instagram'].map((social) => (
                                <Link 
                                  key={social} 
                                  href="#" 
                                  aria-label={social}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Box sx={{ 
                                    width: { xs: 20, sm: 24 },
                                    height: { xs: 20, sm: 24 }
                                  }}>
                                    <Image
                                      src={`/images/${social}.png`}
                                      alt={social}
                                      width={24}
                                      height={24}
                                      style={{ 
                                        filter: 'brightness(0) invert(1)',
                                        width: '100%',
                                        height: '100%'
                                      }}
                                    />
                                  </Box>
                                </Link>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </Container>
                    </Box>
                  </Box>
                )}
                
                {/* Dashboard or Sign-in page content */}
                {(isDashboard || isSignIn) && children}
                
                <ErrorHandler error={error} onClose={handleCloseError} />
              </ErrorBoundary>
            </ErrorContext.Provider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}