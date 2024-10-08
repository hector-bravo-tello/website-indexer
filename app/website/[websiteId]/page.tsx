'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
  TablePagination,
  TableSortLabel,
  useTheme,
  useMediaQuery,
  Button,
  Grid,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { SyncAlt as SyncIcon } from '@mui/icons-material';
import { Website, Page } from '@/types';
import { useError } from '@/lib/useError';
import IndexingStats from '@/components/IndexingStats';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Page | 'impressions' | 'clicks' | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

const headCells: HeadCell[] = [
  { id: 'url', label: 'URL', numeric: false, sortable: true },
  { id: 'indexing_status', label: 'Status', numeric: false, sortable: true },
  { id: 'last_indexed_date', label: 'Last Crawled', numeric: false, sortable: true },
  { id: 'impressions', label: 'Impressions', numeric: true, sortable: true },
  { id: 'clicks', label: 'Clicks', numeric: true, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function WebsiteDetailsPage({ params }: { params: { websiteId: string } }) {
  const websiteId = parseInt(params.websiteId);
  const [website, setWebsite] = useState<Website | null>(null);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Page | 'impressions' | 'clicks'>('url');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [analyticsData, setAnalyticsData] = useState<{ [key: string]: { impressions: number, clicks: number } }>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const setGlobalError = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const cleanDomain = (domain: string): string => {
    return domain.replace(/^(sc-domain:)?(https?:\/\/)?(www\.)?/, '');
  };

  const fetchWebsiteDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const websiteResponse = await fetch(`/api/websites/${websiteId}`);
      if (!websiteResponse.ok) {
        throw new Error('Failed to fetch website details');
      }
      const websiteData = await websiteResponse.json();
      setWebsite(websiteData);

      const pagesResponse = await fetch(`/api/websites/${websiteId}/pages?all=true`);
      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch pages');
      }
      const pagesData = await pagesResponse.json();
      setAllPages(pagesData.pages || []);

      const urls = pagesData.pages.map((p: Page) => p.url);
      const analyticsResponse = await fetch(`/api/websites/${websiteId}/analytics?urls=${urls.join(',')}`);
      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const analyticsData = await analyticsResponse.json();
      setAnalyticsData(analyticsData.data);

    } catch (err) {
      console.error('Error fetching website details:', err);
      setError('An error occurred while fetching website details');
      setGlobalError('Failed to load website details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [websiteId, setGlobalError]);

  useEffect(() => {
    fetchWebsiteDetails();
  }, [fetchWebsiteDetails]);

  const handleRequestSort = (property: keyof Page | 'impressions' | 'clicks') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSubmitForIndexing = async (pageId: number) => {
    try {
      setSubmitting(pageId);
      const response = await fetch(`/api/websites/${websiteId}/pages/${pageId}/submit-for-indexing`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to submit page for indexing');
      }

      const result = await response.json();
      setGlobalError(null);
      setSnackbar({
        open: true,
        message: result.message || 'Page submitted for indexing successfully',
        severity: 'success',
      });

      // Refresh the page data
      fetchWebsiteDetails();
    } catch (err) {
      console.error('Error submitting page for indexing:', err);
      setGlobalError('Failed to submit page for indexing. Please try again later.');
      setSnackbar({
        open: true,
        message: 'Failed to submit page for indexing',
        severity: 'error',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleSyncPages = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/websites/${websiteId}/toggle-indexing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to sync pages');
      }
      await fetchWebsiteDetails();
      setSnackbar({
        open: true,
        message: 'Pages synced successfully',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error syncing pages:', err);
      setGlobalError('Failed to sync pages. Please try again later.');
      setSnackbar({
        open: true,
        message: 'Failed to sync pages',
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getSubmitButtonColor = (status: string) => {
    return status !== 'Submitted and indexed' ? theme.palette.error.light : theme.palette.primary.main;
  };

  const sortedAndPaginatedPages = useMemo(() => {
    const sortedPages = [...allPages].sort((a, b) => {
      const aValue = orderBy === 'impressions' || orderBy === 'clicks' 
        ? (analyticsData[a.url]?.[orderBy] || 0) 
        : a[orderBy as keyof Page];
      const bValue = orderBy === 'impressions' || orderBy === 'clicks'
        ? (analyticsData[b.url]?.[orderBy] || 0)
        : b[orderBy as keyof Page];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return order === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedPages.slice(startIndex, endIndex);
  }, [allPages, order, orderBy, analyticsData, page, rowsPerPage]);

  if (loading && allPages.length === 0) {
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

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h4" component="h1">
            {website ? cleanDomain(website.domain) : 'Website Details'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSyncPages}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Pages'}
          </Button>
        </Grid>
      </Grid>

      <IndexingStats websiteId={websiteId} />

      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Pages
      </Typography>

      {allPages.length > 0 ? (
        <Paper>
          {isMobile ? (
            // Mobile view
            <Box>
              {sortedAndPaginatedPages.map((page) => (
                <Card key={page.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1, wordBreak: 'break-all' }}>
                      {page.url}
                    </Typography>
                    <Typography variant="body2">Status: {page.indexing_status}</Typography>
                    <Typography variant="body2">
                      Last Crawled: {new Date(page.last_indexed_date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      Impressions: {analyticsData[page.url]?.impressions || 0}
                    </Typography>
                    <Typography variant="body2">
                      Clicks: {analyticsData[page.url]?.clicks || 0}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSubmitForIndexing(page.id)}
                      disabled={
                        submitting === page.id ||
                        new Date(page.last_indexed_date).getTime() > Date.now() - 24 * 60 * 60 * 1000
                      }
                      sx={{ 
                        mt: 1, 
                        backgroundColor: getSubmitButtonColor(page.indexing_status),
                        '&:hover': {
                          backgroundColor: theme.palette.error.main,
                        },
                      }}
                    >
                      {submitting === page.id ? <CircularProgress size={24} /> : 'Submit'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop view
            <TableContainer>
              <Table sx={{ minWidth: 300 }} aria-label="website pages table">
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleRequestSort(headCell.id)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndPaginatedPages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {page.url}
                      </TableCell>
                      <TableCell>{page.indexing_status}</TableCell>
                      <TableCell>{new Date(page.last_indexed_date).toLocaleString()}</TableCell>
                      <TableCell align="right">{analyticsData[page.url]?.impressions || 0}</TableCell>
                      <TableCell align="right">{analyticsData[page.url]?.clicks || 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleSubmitForIndexing(page.id)}
                          disabled={
                            submitting === page.id ||
                            new Date(page.last_indexed_date).getTime() > Date.now() - 24 * 60 * 60 * 1000
                          }
                          sx={{ 
                            backgroundColor: getSubmitButtonColor(page.indexing_status),
                            '&:hover': {
                              backgroundColor: theme.palette.error.main,
                            },
                          }}
                          >
                            {submitting === page.id ? <CircularProgress size={24} /> : 'Submit'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={allPages.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        ) : (
          <Alert severity="info">No pages found for this website.</Alert>
        )}
  
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }