import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  CircularProgress, 
  useTheme, 
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Web as WebIcon, 
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

  const fetchWebsites = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchWebsites();
  }, [fetchWebsites]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';

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
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const extractDomainName = (domain: string): string => {
    return domain
      .replace(/^sc-domain:/, '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
  };

  const isLinkActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  const drawerContent = (
    <Box 
      sx={{ 
        width: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        bgcolor: 'primary.dark',
        color: 'white',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '64px',
          borderBottom: '0px solid rgba(255, 255, 255, 0.1)',
          px: 2,
        }}
      >
        <Link 
          href="/dashboard"
          style={{ 
            display: 'flex',
            alignItems: 'center',
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
        </Link>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
        },
      }}>
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
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
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
                  '& .MuiListItemText-primary': {
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }} 
              />
            </ListItem>
          }
        >
          {loading ? (
            <ListItem sx={{ justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: 'white' }} />
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
                    <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
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
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)',
                }} 
              />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Bottom Navigation */}
      <List sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="#"
            sx={{
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="#"
            sx={{
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Help" />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Resizer */}
      {!isMobile && (
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            zIndex: theme.zIndex.drawer + 1,
          }}
        />
      )}
    </Box>
  );

  if (!mounted) {
    return null;
  }

  return (
    <Box 
      component="nav" 
      sx={{ 
        width: { sm: sidebarWidth }, 
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
          '& .MuiDrawer-paper': { 
            width: MOBILE_SIDEBAR_WIDTH,
            bgcolor: 'primary.dark',
            border: 'none',
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
            width: sidebarWidth,
            bgcolor: 'primary.dark',
            border: 'none',
            overflowX: 'hidden',
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