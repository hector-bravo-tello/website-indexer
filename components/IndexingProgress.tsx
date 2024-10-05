import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

interface IndexingStats {
  totalPages: number;
  indexedPages: number;
}

const IndexingProgress: React.FC = () => {
  const [stats, setStats] = useState<IndexingStats>({ totalPages: 0, indexedPages: 0 });

  useEffect(() => {
    fetchIndexingStats();
  }, []);

  const fetchIndexingStats = async () => {
    try {
      const response = await fetch('/api/indexing/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching indexing stats:', error);
    }
  };

  const progress = stats.totalPages > 0 ? (stats.indexedPages / stats.totalPages) * 100 : 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Indexing Progress
      </Typography>
      <LinearProgress variant="determinate" value={progress} />
      <Typography variant="body2" color="textSecondary">
        {stats.indexedPages} / {stats.totalPages} pages indexed
      </Typography>
    </Box>
  );
};

export default IndexingProgress;