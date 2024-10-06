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
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {/* Empty space for alignment */}
        </Typography>
        {session ? (
          <>
            <Typography variant="body1" sx={{ marginRight: 2 }}>
              {session.user?.name}
            </Typography>
            <Button color="inherit" onClick={() => signOut()}>
              Logout
            </Button>
          </>
        ) : null}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
