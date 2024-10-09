// Filename: components/IndexingStats.tsx

import React, { useState, useEffect } from 'react';
import { Grid, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { IndexingStatsData } from '@/types';

interface IndexingStatsProps {
  websiteId: number;
}

const IndexingStats: React.FC<IndexingStatsProps> = ({ websiteId }) => {
  const [indexingStats, setIndexingStats] = useState<IndexingStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIndexingStats();
  }, [websiteId]);

  const fetchIndexingStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/websites/${websiteId}/indexing-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch indexing stats');
      }

      const data = await response.json();
      setIndexingStats(data.indexingStats?.indexingStats || null);

    } catch (err) {
      console.error('Error fetching indexing stats:', err);
      setError('An error occurred while fetching indexing stats');
    } finally {
      setLoading(false);
    }
  };
 
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle1">Total Pages</Typography>
          <Typography variant="h6">{indexingStats?.total_pages || 0}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle1">Indexed Pages</Typography>
          <Typography variant="h6">{indexingStats?.indexed_pages || 0}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle1">Not Indexed Pages</Typography>
          <Typography variant="h6">{indexingStats?.not_indexed_pages || 0}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle1">Auto-indexing</Typography>
          <Typography variant="h6">Enabled</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default IndexingStats;
