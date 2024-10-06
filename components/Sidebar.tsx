import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, CircularProgress } from '@mui/material';
import { Dashboard as DashboardIcon, Web as WebIcon, Close as CloseIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { Website } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280); // Increased sidebar width

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
      setWebsites(data.filter((website: Website) => website.indexing_enabled));
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    setSidebarWidth(Math.max(200, e.clientX)); // Minimum width set to 200px
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  // Utility function to extract clean domain names
  const extractDomainName = (domain: string) => {
    return domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/^www\./, '');
  };

  const drawerContent = (
    <Box sx={{ width: sidebarWidth, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Logo section with close button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', // Center the logo
          padding: 2,
          height: '64px', // Match the height of the AppBar (Navigation)
          position: 'relative',
        }}
      >
        <Link href="/" passHref>
          <Image src="/images/logo.png" alt="App Logo" width={180} height={40} style={{ cursor: 'pointer' }} />
        </Link>
        {onClose && (
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, display: { sm: 'none' } }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Dashboard Link */}
      <List>
        <Link href="/dashboard" passHref legacyBehavior>
          <ListItem button component="a" onClick={handleLinkClick}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
        </Link>
      </List>

      {/* Enabled Websites */}
      <List>
        <ListItem>
          <ListItemText primary="Enabled Websites" />
        </ListItem>
        {loading ? (
          <ListItem>
            <CircularProgress size={24} />
          </ListItem>
        ) : websites.length > 0 ? (
          websites.map((website) => (
            <Link href={`/website/${website.id}`} passHref key={website.id} legacyBehavior>
              <ListItem button component="a" onClick={handleLinkClick}>
                <ListItemIcon>
                  <WebIcon />
                </ListItemIcon>
                <ListItemText primary={extractDomainName(website.domain)} />
              </ListItem>
            </Link>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No enabled websites" />
          </ListItem>
        )}
      </List>

      {/* Resizable Handle */}
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
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: sidebarWidth }, flexShrink: { sm: 0 } }}>
      {/* Mobile Sidebar */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 2, // Ensure drawer is above the top bar in mobile
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth, overflow: 'hidden' }, // Prevent scrollbars
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth, overflow: 'hidden' }, // Prevent scrollbars
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
