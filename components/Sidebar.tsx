import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { Dashboard as DashboardIcon, Web as WebIcon, Close as CloseIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { Website } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
  sidebarWidth: number;
  onSidebarResize: (newWidth: number) => void;
}

const MOBILE_SIDEBAR_WIDTH = 280; // Fixed width for mobile

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, sidebarWidth, onSidebarResize }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/websites');
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      const data = await response.json();
      setWebsites(data.filter((website: Website) => website.enabled));
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractDomainName = (domain: string) => {
    return domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/^www\./, '');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable resizing on mobile
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isMobile) return; // Disable resizing on mobile
    const newWidth = Math.max(200, e.clientX); // Set a minimum sidebar width
    onSidebarResize(newWidth);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const drawerContent = (
    <Box sx={{ width: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          height: '64px',
          position: 'relative',
        }}
      >
        <Link href="/" passHref>
          <Image src="/images/logo.png" alt="App Logo" width={180} height={40} style={{ cursor: 'pointer' }} priority />
        </Link>
        {onClose && (
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, display: { sm: 'none' } }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <List>
        <Link href="/dashboard" passHref legacyBehavior>
          <ListItem component="a" disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" sx={{ color: 'primary.main' }} />
            </ListItemButton>
          </ListItem>
        </Link>
      </List>

      <List>
        <ListItem>
          <ListItemText primary="Auto-Indexed Websites" />
        </ListItem>
        {loading ? (
          <ListItem>
            <CircularProgress size={24} />
          </ListItem>
        ) : websites.length > 0 ? (
          websites.map((website) => (
            <Link href={`/website/${website.id}`} passHref key={website.id} legacyBehavior>
              <ListItem component="a" disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <WebIcon />
                  </ListItemIcon>
                  <ListItemText primary={extractDomainName(website.domain)} sx={{ color: 'primary.main' }} />
                </ListItemButton>
              </ListItem>
            </Link>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No enabled websites" />
          </ListItem>
        )}
      </List>

      {/* Resizable handle only visible for desktop sidebar */}
      {!isMobile && (
        <Box
          sx={{
            width: '5px',
            cursor: 'col-resize',
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100vh',
            zIndex: 1000,
            backgroundColor: 'transparent',
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth }, flexShrink: { sm: 0 } }}>
      {/* Mobile Sidebar */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 2,
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: MOBILE_SIDEBAR_WIDTH, overflow: 'hidden' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth, overflow: 'hidden' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;