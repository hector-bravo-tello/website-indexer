'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

interface NavigationProps {
  children?: React.ReactNode;
}

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const { data: session } = useSession();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {children}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref style={{ color: 'inherit', textDecoration: 'none' }}>
            Website Indexer
          </Link>
        </Typography>
        {session ? (
          <>
            <Typography variant="body1" sx={{ marginRight: 2 }}>
              {session.user.name}
            </Typography>
            <Button color="inherit" onClick={() => signOut()}>
              Logout
            </Button>
          </>
        ) : (
          <Button color="inherit" onClick={() => signIn()}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

Navigation.Offset = () => (
  <Box sx={{ minHeight: (theme) => theme.mixins.toolbar.minHeight }} />
);

export default Navigation;