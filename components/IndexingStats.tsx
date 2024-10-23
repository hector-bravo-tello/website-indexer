// components/IndexingStats.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Typography, Paper, Alert, Skeleton } from '@mui/material';
import { IndexingStatsData } from '@/types';
import { useError } from '@/lib/useError';
import { formatDateToLocal } from '@/utils/dateFormatter';

interface IndexingStatsProps {
  websiteId: number;
  refreshTrigger?: number;
};

const IndexingStats: React.FC<IndexingStatsProps> = ({ websiteId, refreshTrigger }) => {
  const [indexingStats, setIndexingStats] = useState<IndexingStatsData | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const setError = useError();

  const fetchIndexingStats = useCallback(async () => {
    try {
      setErrorState(null);

      const response = await fetch(`/api/websites/${websiteId}/indexing-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch indexing stats');
      }

      const data = await response.json();
      const stats = data.indexingStats.indexingStats;
      console.log('Received stats:', stats);
      setIndexingStats(stats);

    } catch (err) {
      console.error('Error fetching indexing stats:', err);
      setErrorState('An error occurred while fetching indexing stats');
      setError('Failed to load indexing statistics. Please try again later.');
    }
  }, [websiteId, setError]);

  useEffect(() => {
    fetchIndexingStats();
  }, [fetchIndexingStats, refreshTrigger]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!indexingStats) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Grid item xs={12} sm={6} md={2.4} key={item}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Typography variant="subtitle1" color="textSecondary">Total Pages</Typography>
          <Typography variant="h6">
            {indexingStats?.total_pages || 0}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Typography variant="subtitle1" color="textSecondary">Indexed Pages</Typography>
          <Typography variant="h6" color="success.main">
            {indexingStats?.indexed_pages || 0}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Typography variant="subtitle1" color="textSecondary">Not Indexed Pages</Typography>
          <Typography variant="h6" color="warning.main">
            {indexingStats?.not_indexed_pages || 0}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Typography variant="subtitle1" color="textSecondary">Last Sync</Typography>
          <Typography variant="caption">
            {formatDateToLocal(indexingStats.last_sync)}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Typography variant="subtitle1" color="textSecondary">Last Auto-Index</Typography>
          <Typography variant="caption">
            {formatDateToLocal(indexingStats.last_auto_index)}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default IndexingStats;