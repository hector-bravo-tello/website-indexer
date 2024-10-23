// components/Navigation.tsx
'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useSession, signOut } from 'next-auth/react';

interface NavigationProps {
  sidebarWidth: number;
  onMenuClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ sidebarWidth, onMenuClick }) => {
  const { data: session } = useSession();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: { sm: `calc(100% - ${sidebarWidth}px)` },
        ml: { sm: `${sidebarWidth}px` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)', // Subtle shadow
      }}
    >
      <Toolbar>
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 2, 
            display: { sm: 'none' },
            color: 'primary.main',
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {/* Placeholder for alignment */}
        </Typography>
        {session ? (
          <>
            <Typography 
              variant="body1" 
              sx={{ 
                marginRight: 2,
                color: 'text.primary',
              }}
            >
              {session.user?.name}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => signOut({ callbackUrl: '/' })}
              sx={{
                color: 'primary.main',
                borderColor: 'primary.main',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderColor: 'primary.main',
                },
              }}
            >
              Logout
            </Button>
          </>
        ) : null}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;