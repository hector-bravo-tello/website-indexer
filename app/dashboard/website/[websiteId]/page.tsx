// File: app/website/[websiteId]/page.tsx

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
import { formatDateToLocal } from '@/utils/dateFormatter';

type SortableColumn = keyof Page | "impressions" | "clicks";
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
  { id: 'impressions', label: 'Impressions', numeric: true, sortable: true },
  { id: 'clicks', label: 'Clicks', numeric: true, sortable: true },
  { id: 'last_crawled_date', label: 'Last Crawled', numeric: false, sortable: true },
  { id: 'last_submitted_date', label: 'Last Submitted', numeric: false, sortable: true },  
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const indexed: string = 'Submitted and indexed';

export default function WebsiteDetailsPage({ params }: { params: { websiteId: string } }) {
  const websiteId = parseInt(params.websiteId);
  const [website, setWebsite] = useState<Website | null>(null);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<SortableColumn>('indexing_status');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [metricsData, setmetricsData] = useState<{ [key: string]: { impressions: number, clicks: number } }>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [initialScanTime, setInitialScanTime] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const MAX_POLLING_ATTEMPTS = 6;
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const setGlobalError = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const cleanDomain = (inputDomain: string): string => {
    let cleanedDomain = inputDomain.replace(/^sc-domain:/, '');
    try {
      const url = new URL(cleanedDomain);
      cleanedDomain = url.hostname;
    } catch {
      // If it's not a valid URL, assume it's already just a domain
    }
    cleanedDomain = cleanedDomain.replace(/^www\./, '');
    return cleanedDomain;
  }

  const formatLastCrawled = (date: Date | null): string => {
    return date ? formatDateToLocal(date) : 'Not crawled yet';
  };

  const formatLastSubmitted = (date: Date | null): string => {
    return date ? formatDateToLocal(date) : '';
  };

  const isSortableColumn = (id: string): id is SortableColumn => {
    return id !== 'actions';
  };

  const canSubmitForIndexing = (lastSubmittedDate: Date | null): boolean => {
    if (!lastSubmittedDate) return true; // If never submitted, allow submission
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return new Date(lastSubmittedDate).getTime() <= twentyFourHoursAgo;
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
      //console.log('websiteData: ', websiteData);
      setWebsite(websiteData);

      const pagesResponse = await fetch(`/api/websites/${websiteId}/pages?all=true`);
      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch pages');
      }
      const pagesData = await pagesResponse.json();
      //console.log('pagesData: ', pagesData.totalCount || 0);

      if (pagesData.totalCount > 0) {
        setAllPages(pagesData.pages || []);

        const urls = pagesData.pages.map((p: Page) => p.url);
        const metricsResponse = await fetch(`/api/websites/${websiteId}/metrics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls }),
        });
        if (!metricsResponse.ok) {
          throw new Error('Failed to fetch metrics data');
        }
        const metricsData = await metricsResponse.json();
        setmetricsData(metricsData.data);
      }

    } catch (err) {
      console.error('Error fetching website details:', err);
      setError('An error occurred while fetching website details');
      setGlobalError('Failed to load website details. Please try again later.');

    } finally {
      setLoading(false);
    }
  }, [websiteId, setGlobalError]);

  const handleRequestSort = (property: keyof Page | "impressions" | "clicks" | "actions") => {
    if (isSortableColumn(property)) {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
    }
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
      setPollingAttempts(0);

      const response = await fetch(`/api/websites/${websiteId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync pages');
      }

      const data = await response.json();
      console.log(data);

      setInitialScanTime(data.initialScanTime);
      setIsPolling(true);
      setSnackbar({
        open: true,
        message: 'Sync pages started',
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

  const checkJobStatus = useCallback(async () => {
    if (!initialScanTime) return;
  
    try {
      const response = await fetch(`/api/websites/${websiteId}/toggle?initialScanTime=${initialScanTime}`);
      if (!response.ok) {
        throw new Error('Failed to check sync status');
      }
      const data = await response.json();
      
      if (data.isCompleted) {
        setIsPolling(false);
        setStatsRefreshTrigger(prev => prev + 1);
        await fetchWebsiteDetails();
        setSnackbar({
          open: true,
          message: 'Pages sync completed',
          severity: 'success',
        });
      } else {
        setPollingAttempts(prevAttempts => prevAttempts + 1);
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
      setIsPolling(false);
      setSnackbar({
        open: true,
        message: 'Error checking sync status',
        severity: 'error',
      });
    }
  }, [initialScanTime, websiteId, fetchWebsiteDetails, pollingAttempts]);

  useEffect(() => {
    fetchWebsiteDetails();
  }, [fetchWebsiteDetails]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
  
    if (isPolling && pollingAttempts < MAX_POLLING_ATTEMPTS) {
      intervalId = setInterval(checkJobStatus, 5000); // Poll every 5 seconds
    } else if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
      setIsPolling(false);
    }
  
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, checkJobStatus, pollingAttempts]);

  useEffect(() => {
    if (!isPolling) {
      fetchWebsiteDetails();
    }
  }, [isPolling, fetchWebsiteDetails]);

  const getSubmitButtonColor = (status: string) => {
    return status !== indexed ? theme.palette.error.light : theme.palette.primary.main;
  };

  const sortedAndPaginatedPages = useMemo(() => {
    const sortedPages = [...allPages].sort((a, b) => {
      const aValue = orderBy === 'impressions' || orderBy === 'clicks' 
        ? (metricsData[a.url]?.[orderBy] || 0) 
        : a[orderBy as keyof Page];
      const bValue = orderBy === 'impressions' || orderBy === 'clicks'
        ? (metricsData[b.url]?.[orderBy] || 0)
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
  }, [allPages, order, orderBy, metricsData, page, rowsPerPage]);

  if (loading && allPages.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>);
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
            disabled={syncing || isPolling}
            sx={{
              textTransform: 'none',
              borderColor: 'success.main',
              color: 'success.main',
              '&:hover': {
                backgroundColor: 'success.main',
                color: 'white',
                borderColor: 'success.main',
              },
              '&.Mui-disabled': {
                borderColor: 'action.disabled',
                color: 'action.disabled',
              }
            }}
          >
            {syncing ? 'Syncing...' : isPolling ? 'Sync in Progress...' : 'Sync Pages'}
          </Button>
        </Grid>
      </Grid>

      <IndexingStats websiteId={websiteId} refreshTrigger={statsRefreshTrigger} />

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
                    <Typography variant="body2">
                      Status: {page.indexing_status}
                    </Typography>
                    <Typography variant="body2">
                      Impressions: {metricsData[page.url]?.impressions || 0}
                    </Typography>
                    <Typography variant="body2">
                      Clicks: {metricsData[page.url]?.clicks || 0}
                    </Typography>
                    <Typography variant="body2">
                      Last Crawled: {formatLastCrawled(page.last_crawled_date)}
                    </Typography>
                    <Typography variant="body2">
                      Last Submitted: {formatLastSubmitted(page.last_submitted_date)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSubmitForIndexing(page.id)}
                      disabled={
                        submitting === page.id ||
                        !canSubmitForIndexing(page.last_submitted_date)
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
                      <TableCell align="right">{metricsData[page.url]?.impressions || 0}</TableCell>
                      <TableCell align="right">{metricsData[page.url]?.clicks || 0}</TableCell>
                      <TableCell>{formatLastCrawled(page.last_crawled_date)}</TableCell>
                      <TableCell>{formatLastSubmitted(page.last_submitted_date)}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleSubmitForIndexing(page.id)}
                          disabled={
                            submitting === page.id ||
                            !canSubmitForIndexing(page.last_submitted_date)
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