import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography } from '@mui/material';

interface AnalyticsData {
  totalVisits: number;
  averageSessionDuration: string;
  bounceRate: string;
}

const AnalyticsSummary: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/analytics/summary');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  if (!analyticsData) {
    return <Typography>Loading analytics data...</Typography>;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={4}>
        <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6">{analyticsData.totalVisits}</Typography>
          <Typography variant="body2">Total Visits</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6">{analyticsData.averageSessionDuration}</Typography>
          <Typography variant="body2">Avg. Session Duration</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6">{analyticsData.bounceRate}%</Typography>
          <Typography variant="body2">Bounce Rate</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AnalyticsSummary;