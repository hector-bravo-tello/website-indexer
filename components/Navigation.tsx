// File: components/Navigation.tsx
'use client';

import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref>
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
}