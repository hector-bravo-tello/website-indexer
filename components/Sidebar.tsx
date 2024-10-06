import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, CircularProgress } from '@mui/material';
import { Dashboard as DashboardIcon, Web as WebIcon } from '@mui/icons-material';
import Link from 'next/link';
import { Website } from '@/types';

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

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

  const extractDomain = (input: string): string => {
    if (!input) return 'Unknown Domain';
    
    let domain = input.replace(/^sc-domain:/, '');
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
    domain = domain.split('/')[0].split('?')[0];
    
    return domain;
  };

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: open ? 240 : 0 },
        flexShrink: { sm: 0 },
      }}
    >
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
            top: ['64px', '64px', '64px'],
            height: 'calc(100% - 64px)',
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <List>
          <ListItem component={Link} href="/dashboard">
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
        </List>
        <Divider />
        <List>
          <ListItem>
            <ListItemText primary="Enabled Websites" />
          </ListItem>
          {loading ? (
            <ListItem>
              <CircularProgress size={24} />
            </ListItem>
          ) : (
            websites.map((website) => (
              <ListItem
                key={website.id}
                component={Link}
                href={`/website/${website.id}`}
              >
                <ListItemIcon>
                  <WebIcon />
                </ListItemIcon>
                <ListItemText primary={extractDomain(website.domain)} />
              </ListItem>
            ))
          )}
        </List>
      </Drawer>
    </Box>
  );
};

export default Sidebar;