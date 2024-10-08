'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Snackbar,
  Alert,
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
  Switch
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { withAuth } from '@/components/withAuth';
import { Website } from '@/types';
import { useError } from '@/lib/useError';


const Dashboard: React.FC = () => {
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
  const setError = useError();

  const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
  ) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });
  

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
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
  };

  const handleToggleIndexing = async (websiteId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/toggle-indexing`, {
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
          website.id === websiteId ? { ...website, indexing_enabled: !currentStatus } : website
        ) || null
      );
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error toggling indexing:', error);
      setError('Failed to update indexing status. Please try again later.');
      setSnackbar({
        open: true,
        message: 'Failed to update indexing status',
        severity: 'error',
      });
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/websites/refresh', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh websites');
      }
      await fetchWebsites();
      setSnackbar({
        open: true,
        message: 'Websites refreshed successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error refreshing websites:', error);
      setError('Failed to refresh websites. Please try again later.');
      setSnackbar({
        open: true,
        message: 'Failed to refresh websites',
        severity: 'error',
      });
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
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const sortedWebsites = websites?.slice().sort((a, b) => {
    let valueA = a[orderBy];
    let valueB = b[orderBy];
    
    if (orderBy === 'domain') {
      valueA = extractDomain(valueA as string);
      valueB = extractDomain(valueB as string);
    } else if (orderBy === 'last_robots_scan') {
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

  const paginatedWebsites = sortedWebsites?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          variant="outlined"
        >
          Refresh from Google Search Console
        </Button>
      </Box>
      {websites && (
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
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'last_robots_scan'}
                    direction={orderBy === 'last_robots_scan' ? order : 'asc'}
                    onClick={() => handleRequestSort('last_robots_scan')}
                  >
                    Last Scanned
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'indexing_enabled'}
                    direction={orderBy === 'indexing_enabled' ? order : 'asc'}
                    onClick={() => handleRequestSort('indexing_enabled')}
                  >
                    Auto-Indexing
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedWebsites?.map((website) => (
                <TableRow key={website.id}>
                  <TableCell>
                    {website.indexing_enabled ? (
                      <Link href={`/website/${website.id}`} passHref>
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
                  <TableCell>{formatLastScanned(website.last_robots_scan)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={website.indexing_enabled}
                      onChange={() => handleToggleIndexing(website.id, website.indexing_enabled)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={websites?.length || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
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
    </Container>
  );
};

export default withAuth(Dashboard);