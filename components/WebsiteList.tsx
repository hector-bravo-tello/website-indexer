// components/WebsiteList.tsx

import React, { useState, useEffect } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  Switch, 
  Typography, 
  Button,
  CircularProgress
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Website } from '@/types';
import { formatDateToLocal } from '@/utils/dateFormatter';

interface WebsiteListProps {
  websites: Website[];
  onToggleIndexing: (websiteId: number, currentStatus: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ 
  websites, 
  onToggleIndexing, 
  onRefresh,
  loading = false 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatLastScanned = (date: Date | null): string => {
    return date ? formatDateToLocal(date) : 'Never';
  };

  if (!mounted) {
    return null;
  }
  
  return (
    <>
      <Button
        startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
        onClick={onRefresh}
        variant="outlined"
        disabled={loading}
        style={{ marginBottom: '1rem' }}
      >
        {loading ? 'Refreshing...' : 'Refresh from Search Console'}
      </Button>
      <List>
        {websites.map((website) => (
          <ListItem key={website.id} component="div">
            <ListItemText 
              primary={website.domain}
              secondary={`Last synced: ${formatLastScanned(website.last_sync)}`}
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                onChange={() => onToggleIndexing(website.id, website.auto_indexing_enabled)}
                checked={website.auto_indexing_enabled}
                disabled={!website.is_owner}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {websites.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center">
            No websites found. Click &quot;Refresh from Search Console&quot; to fetch your properties.
          </Typography>
        )}
      </List>
    </>
  );
};

export default WebsiteList;