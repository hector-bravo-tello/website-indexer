'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  CircularProgress, 
  useTheme, 
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Web as WebIcon, 
  Close as CloseIcon,
  Settings as SettingsIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Website } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
  sidebarWidth: number;
  onSidebarResize: (newWidth: number) => void;
}

const MOBILE_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;

const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose, 
  sidebarWidth, 
  onSidebarResize 
}) => {
  const [mounted, setMounted] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
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

  const extractDomainName = (domain: string): string => {
    return domain
      .replace(/^sc-domain:/, '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.min(
      Math.max(MIN_SIDEBAR_WIDTH, e.clientX),
      MAX_SIDEBAR_WIDTH
    );
    onSidebarResize(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const isLinkActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  // Don't render until client-side
  if (!mounted) {
    return null;
  }

  const drawerContent = (
    <Box 
      sx={{ 
        width: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative', 
        overflow: 'hidden',
        bgcolor: 'primary.dark',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          height: '64px',
          position: 'relative',
          borderBottom: '0px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box 
          component={Link} 
          href="/dashboard"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
        >
          <Image 
            src="/images/logo.png" 
            alt="App Logo" 
            width={180} 
            height={35} 
            priority 
          />
        </Box>
        {onClose && (
          <IconButton 
            onClick={onClose} 
            sx={{ 
              position: 'absolute', 
              right: 8, 
              display: { sm: 'none' },
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List component="nav">
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard"
              selected={isLinkActive('/dashboard')}
              sx={{
                color: 'white',
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'white' }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Websites Section */}
        <List
          subheader={
            <ListItem>
              <ListItemText 
                primary="Auto-Indexed Websites" 
                sx={{ 
                  color: 'white',
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.7,
                  },
                }} 
              />
            </ListItem>
          }
        >
          {loading ? (
            <ListItem>
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 2 }}>
                <CircularProgress sx={{ color: 'white' }} size={24} />
              </Box>
            </ListItem>
          ) : websites.length > 0 ? (
            websites.map((website) => (
              <ListItem key={website.id} disablePadding>
                <Tooltip title={website.domain} placement="right">
                  <ListItemButton
                    component={Link}
                    href={`/dashboard/website/${website.id}`}
                    selected={isLinkActive(`/dashboard/website/${website.id}`)}
                    sx={{
                      color: 'white',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white' }}>
                      <WebIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={extractDomainName(website.domain)}
                      sx={{
                        '& .MuiListItemText-primary': {
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary="No enabled websites" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  py: 2,
                }} 
              />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Bottom Section */}
      <List sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            //href="/dashboard/settings"
            href="#"
            selected={isLinkActive('/dashboard/settings')}
            sx={{
              color: 'white',
              '&.Mui-selected': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            //href="/dashboard/help"
            href="#"
            selected={isLinkActive('/dashboard/help')}
            sx={{
              color: 'white',
              '&.Mui-selected': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Help" />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Resizer */}
      {!isMobile && (
        <Box
          sx={{
            width: '5px',
            cursor: 'col-resize',
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            display: isResizing ? 'none' : 'block',
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </Box>
  );

  return (
    <Box 
      component="nav" 
      sx={{ 
        width: { sm: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth }, 
        flexShrink: { sm: 0 } 
      }}
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 2,
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: MOBILE_SIDEBAR_WIDTH, 
            bgcolor: 'primary.dark',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: sidebarWidth, 
            bgcolor: 'primary.dark',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;