'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Snackbar,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TablePagination, 
  TableSortLabel,
  Button,
  Switch,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Refresh as RefreshIcon, Info as InfoIcon } from '@mui/icons-material';
import { WithAuth } from '@/components/WithAuth';
import { PermissionsModal } from '@/components/PermissionsModal';
import { Website } from '@/types';
import { useError } from '@/lib/useError';
import { formatDateToLocal } from '@/utils/dateFormatter';

const Dashboard: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [websites, setWebsites] = useState<Website[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Website>('domain');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [initialScanTime, setInitialScanTime] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const MAX_POLLING_ATTEMPTS = 3;
  
  const setError = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
  ) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  const fetchServiceAccountEmail = useCallback(async () => {
    try {
      const response = await fetch('/api/sae');
      if (!response.ok) {
        throw new Error('Failed to fetch service account email');
      }
      const data = await response.json();
      setServiceAccountEmail(data.email);
    } catch (error) {
      console.error('Error fetching service account email:', error);
      setError('Failed to load service account email. Please try again later.');
    }
  }, [setError]);

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/websites');
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      const data = await response.json();
      setWebsites(data);
    } catch (error) {
      console.error('Error fetching websites:', error);
      setError('Failed to load websites. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  const checkJobStatus = useCallback(async () => {
    if (!initialScanTime) return;
  
    try {
      const response = await fetch(`/api/websites/status?initialScanTime=${initialScanTime}`);
      if (!response.ok) {
        throw new Error('Failed to check sync status');
      }
      const data = await response.json();
      
      if (data.isCompleted) {
        setIsPolling(false);
        await fetchWebsites();
        setSnackbar({
          open: true,
          message: 'Websites sync completed',
          severity: 'success',
        });
      } else {
        setPollingAttempts(prevAttempts => prevAttempts + 1);
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
          setIsPolling(false);
          setSnackbar({
            open: true,
            message: 'Sync taking longer than expected. Please check back later.',
            severity: 'error',
          });
        }
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
      setIsPolling(false);
      setError('Failed to check sync status. Please try again later.');
    }
  }, [initialScanTime, fetchWebsites, pollingAttempts, setError]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
  
    if (isPolling && pollingAttempts < MAX_POLLING_ATTEMPTS) {
      intervalId = setInterval(checkJobStatus, 5000); // Poll every 5 seconds
    }
  
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, checkJobStatus, pollingAttempts]);

  useEffect(() => {
    fetchWebsites();
    fetchServiceAccountEmail();
  }, [fetchWebsites, fetchServiceAccountEmail]);

  const handleToggleEnabled = async (websiteId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !currentStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle indexing');
      }
      const data = await response.json();
      
      setWebsites(prevWebsites => 
        prevWebsites?.map(website => 
          website.id === websiteId ? { ...website, enabled: !currentStatus } : website
        ) || null
      );

      if (data.initialScanTime) {
        setInitialScanTime(data.initialScanTime);
        setIsPolling(true);
        setPollingAttempts(0);
      }

      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error toggling indexing:', error);
      setError('Failed to update indexing status. Please try again later.');
    }
  };

  const handleToggleAutoIndexing = async (websiteId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auto_indexing_enabled: !currentStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle auto-indexing');
      }
      const data = await response.json();
      setWebsites(prevWebsites => 
        prevWebsites?.map(website => 
          website.id === websiteId ? { ...website, auto_indexing_enabled: !currentStatus } : website
        ) || null
      );
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error toggling auto-indexing:', error);
      setError('Failed to update auto-indexing status. Please try again later.');
    }
  };

  const handleVerifyOwnershipPermissions = async (websiteId: number) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/verify-ownership`);
      if (!response.ok) {
        throw new Error('Failed to verify ownership permissions');
      }
      const data = await response.json();
      setWebsites(prevWebsites => 
        prevWebsites?.map(website => 
          website.id === websiteId ? { ...website, is_owner: data.is_owner } : website
        ) || null
      );
      setSnackbar({
        open: true,
        message: data.message,
        severity: data.is_owner ? 'success' : 'error',
      });
    } catch (error) {
      console.error('Error verifying permissions:', error);
      setError('Failed to verify permissions. Please try again later.');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/websites/refresh', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh websites');
      }
      const data = await response.json();
      await fetchWebsites();
      
      if (data.initialScanTime) {
        setInitialScanTime(data.initialScanTime);
        setIsPolling(true);
        setPollingAttempts(0);
      }

      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error refreshing websites:', error);
      setError('Failed to refresh websites. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property: keyof Website) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const extractDomain = (input: string): string => {
    if (!input) return 'Unknown Domain';
    let domain = input.replace(/^sc-domain:/, '');
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
    domain = domain.split('/')[0].split('?')[0];
    return domain;
  };

  const formatLastScanned = (date: Date | null): string => {
    return date ? formatDateToLocal(date) : 'Never';
  };

  const sortedWebsites = useMemo(() => {
    if (!websites) return [];
    return [...websites].sort((a, b) => {
      let valueA: any = a[orderBy];
      let valueB: any = b[orderBy];
      
      if (orderBy === 'domain') {
        valueA = extractDomain(valueA as string);
        valueB = extractDomain(valueB as string);
      } else if (orderBy === 'last_sync') {
        valueA = valueA ? new Date(valueA as Date).getTime() : 0;
        valueB = valueB ? new Date(valueB as Date).getTime() : 0;
      }
      
      if (valueA < valueB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [websites, order, orderBy]);

  const paginatedWebsites = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedWebsites.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedWebsites, page, rowsPerPage]);

  const renderOwnershipChip = (isOwner: boolean | null) => {
    if (isOwner === null) {
      return <Chip label="Unknown" color="default" variant="outlined" />;
    }
    return isOwner ? (
      <Chip label="Owner" color="success" variant="outlined" />
    ) : (
      <Chip label="Not Owner" color="warning" variant="outlined" />
    );
  };

  if (loading && !websites) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Don't render anything until the component is mounted
  if (!mounted) {
    return null;
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Dashboard
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            startIcon={<InfoIcon />}
            onClick={() => setModalOpen(true)}
            variant="outlined"
            sx={{ 
              mr: { xs: 0, sm: 2 }, 
              mb: { xs: 1, sm: 0 },
              borderColor: 'primary.main',
              color: 'primary.main',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'primary.main',
                color: 'white',
                borderColor: 'primary.main',
              }
            }}
          >
            How to Enable Auto-Indexing
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            variant="outlined"
            disabled={isPolling}
            sx={{
              borderColor: 'success.main',
              color: 'success.main',
              textTransform: 'none',
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
            {isPolling ? 'Syncing...' : 'Refresh from Google Search Console'}
          </Button>
        </Grid>
      </Grid>

      {websites && (
        <>
          {isMobile ? (
            // Mobile view
            <Box>
              {paginatedWebsites.map((website) => (
                <Card key={website.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1, wordBreak: 'break-all' }}>
                      {website.enabled ? (
                        <Link href={`/dashboard/website/${website.id}`} passHref>
                          <Typography
                            component="a"
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {extractDomain(website.domain)}
                          </Typography>
                        </Link>
                      ) : (
                        extractDomain(website.domain)
                      )}
                    </Typography>
                    <Typography variant="body2">
                      Enabled: 
                      <Switch
                        checked={website.enabled}
                        onChange={() => handleToggleEnabled(website.id, website.enabled)}
                      />
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      Permissions:&nbsp; {renderOwnershipChip(website.is_owner)}
                      <Tooltip title="Refresh Permissions">
                        <IconButton onClick={() => handleVerifyOwnershipPermissions(website.id)} size="small">
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Typography>
                    <Typography variant="body2">
                      Auto-indexing: 
                      <Switch
                        checked={website.auto_indexing_enabled}
                        onChange={() => handleToggleAutoIndexing(website.id, website.auto_indexing_enabled)}
                        disabled={!website.is_owner}
                      />
                    </Typography>
                    <Typography variant="body2">
                      Last Synced: {formatLastScanned(website.last_sync)}
                    </Typography>
                    <Typography variant="body2">
                      Last Auto-Index: {formatLastScanned(website.last_auto_index)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop view
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'domain'}
                        direction={orderBy === 'domain' ? order : 'asc'}
                        onClick={() => handleRequestSort('domain')}
                      >
                        Website
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Enabled</TableCell>
                    <TableCell>Permissions</TableCell>
                    <TableCell>Auto-indexing</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'last_sync'}
                        direction={orderBy === 'last_sync' ? order : 'asc'}
                        onClick={() => handleRequestSort('last_sync')}
                      >
                        Last Synced
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'last_auto_index'}
                        direction={orderBy === 'last_auto_index' ? order : 'asc'}
                        onClick={() => handleRequestSort('last_auto_index')}
                      >
                        Last Auto-Index
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedWebsites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell>
                        {website.enabled ? (
                          <Link href={`/dashboard/website/${website.id}`} passHref>
                            <Typography 
                              component="a" 
                              sx={{ 
                                color: 'primary.main', 
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              {extractDomain(website.domain)}
                            </Typography>
                          </Link>
                        ) : (
                          extractDomain(website.domain)
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={website.enabled}
                          onChange={() => handleToggleEnabled(website.id, website.enabled)}
                        />
                      </TableCell>
                      <TableCell>
                        {renderOwnershipChip(website.is_owner)}
                        <Tooltip title="Refresh Permissions">
                          <IconButton onClick={() => handleVerifyOwnershipPermissions(website.id)} size="small">
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={website.auto_indexing_enabled}
                          onChange={() => handleToggleAutoIndexing(website.id, website.auto_indexing_enabled)}
                          disabled={!website.is_owner}
                        />
                      </TableCell>
                      <TableCell>{formatLastScanned(website.last_sync)}</TableCell>
                      <TableCell>{formatLastScanned(website.last_auto_index)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={sortedWebsites.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
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

      <PermissionsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        serviceAccountEmail={serviceAccountEmail}
      />
    </Container>
  );
};

export default WithAuth(Dashboard);