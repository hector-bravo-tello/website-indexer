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
          <ListItem key={website.id}>
            <ListItemText 
              primary={website.domain}
              secondary={`Last scanned: ${new Date(website.last_robots_scan || '').toLocaleString()}`}
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                onChange={() => handleToggle(website.id, website.indexing_enabled)}
                checked={website.indexing_enabled}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {websites.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center">
            No websites found. Click 'Refresh from Search Console' to fetch your properties.
          </Typography>
        )}
      </List>
    </>
  );
};

export default WebsiteList;