'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Website, Page } from '@/types';
import { useError } from '@/lib/useError';

interface IndexingStats {
  total_pages: number,
  indexed_pages: number,
  not_indexed_pages: number
}

const indexed: string = 'Submitted and indexed';

export default function WebsiteDetailsPage({ params }: { params: { websiteId: string } }) {
  const websiteId = parseInt(params.websiteId);
  const [website, setWebsite] = useState<Website | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [indexingStats, setIndexingStats] = useState<IndexingStats>({
    total_pages: 0,
    indexed_pages: 0,
    not_indexed_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setGlobalError = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchWebsiteDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const websiteResponse = await fetch(`/api/websites/${websiteId}`);
        const pagesResponse = await fetch(`/api/websites/${websiteId}/pages`);

        if (!websiteResponse.ok || !pagesResponse.ok) {
          throw new Error('Failed to fetch website details');
        }

        const websiteData = await websiteResponse.json();
        const pagesData = await pagesResponse.json();

        if (!websiteData) {
          setError('Website not found');
          return;
        }

        setWebsite(websiteData);
        setPages(pagesData.pages || []);

        // Calculate indexing stats
        const totalPages = pagesData.pages ? pagesData.pages.length : 0;
        const indexedPages = pagesData.pages ? pagesData.pages.filter((page: Page) => page.indexing_status === indexed).length : 0;
        const notIndexedPages = totalPages - indexedPages;

        setIndexingStats({
          total_pages: totalPages,
          indexed_pages: indexedPages,
          not_indexed_pages: notIndexedPages
        });

      } catch (err) {
        console.error('Error fetching website details:', err);
        setError('An error occurred while fetching website details');
        setGlobalError('Failed to load website details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWebsiteDetails();
  }, [websiteId, setGlobalError]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!website) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="warning">Website not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {website.domain}
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1">Total Pages</Typography>
            <Typography variant="h6">{indexingStats.total_pages}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1">Indexed Pages</Typography>
            <Typography variant="h6">{indexingStats.indexed_pages}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1">Not Indexed Pages</Typography>
            <Typography variant="h6">{indexingStats.not_indexed_pages}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1">Auto-indexing</Typography>
            <Typography variant="h6">{website.indexing_enabled ? 'Enabled' : 'Disabled'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Pages
      </Typography>
      
      {pages.length > 0 ? (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 300 }} aria-label="website pages table">
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                {!isMobile && <TableCell>Status</TableCell>}
                <TableCell>Last Indexed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell component="th" scope="row" sx={{
                    maxWidth: isMobile ? 150 : 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {page.url}
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      {page.indexing_status === indexed ? 'Indexed' : 'Not Indexed'}
                    </TableCell>
                  )}
                  <TableCell>
                    {isMobile && (
                      <Typography variant="body2" color="text.secondary">
                        {page.indexing_status === indexed ? 'Indexed' : 'Not Indexed'}
                      </Typography>
                    )}
                    {page.last_indexed_date 
                      ? new Date(page.last_indexed_date).toLocaleString() 
                      : 'Never'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">No pages found for this website.</Alert>
      )}
    </Box>
  );
}