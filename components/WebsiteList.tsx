import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  Switch, 
  Typography, 
  Button 
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Website } from '@/types';

interface WebsiteListProps {
  websites: Website[];
  onToggleIndexing: (websiteId: number, currentStatus: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ websites, onToggleIndexing, onRefresh }) => {
  const handleToggle = async (websiteId: number, currentStatus: boolean) => {
    await onToggleIndexing(websiteId, currentStatus);
  };

  const formatLastScanned = (date: Date | null | undefined): string => {
    if (!date) return 'None';
    const formattedDate = new Date(date).toLocaleString();
    return formattedDate !== 'Invalid Date' ? formattedDate : 'None';
  };

  return (
    <>
      <Button
        startIcon={<RefreshIcon />}
        onClick={onRefresh}
        variant="outlined"
        style={{ marginBottom: '1rem' }}
      >
        Refresh from Search Console
      </Button>
      <List>
        {websites.map((website) => (
          <ListItem key={website.id} component="div">
            <ListItemText 
              primary={website.domain}
              secondary={`Last scanned: ${formatLastScanned(website.last_robots_scan)}`}
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                onChange={() => handleToggle(website.id, website.auto_indexing_enabled)}
                checked={website.auto_indexing_enabled}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {websites.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center">
            No websites found. Click &quote;Refresh from Search Console&quote; to fetch your properties.
          </Typography>
        )}
      </List>
    </>
  );
};

export default WebsiteList;