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
  TablePagination,
  TableSortLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Website, Page } from '@/types';
import { useError } from '@/lib/useError';

interface IndexingStats {
  total_pages: number;
  indexed_pages: number;
  not_indexed_pages: number;
}

const indexed: string = 'Submitted and indexed';

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Page;
  label: string;
  numeric: boolean;
}

const headCells: HeadCell[] = [
  { id: 'url', label: 'URL', numeric: false },
  { id: 'indexing_status', label: 'Status', numeric: false },
  { id: 'last_indexed_date', label: 'Last Indexed', numeric: false },
];

export default function WebsiteDetailsPage({ params }: { params: { websiteId: string } }) {
  const websiteId = parseInt(params.websiteId);
  const [website, setWebsite] = useState<Website | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [indexingStats, setIndexingStats] = useState<IndexingStats>({
    total_pages: 0,
    indexed_pages: 0,
    not_indexed_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Page>('url');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const setGlobalError = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchWebsiteDetails();
  }, [websiteId, page, rowsPerPage, order, orderBy]);

  const fetchWebsiteDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const websiteResponse = await fetch(`/api/websites/${websiteId}`);
      const pagesResponse = await fetch(`/api/websites/${websiteId}/pages?page=${page}&pageSize=${rowsPerPage}&orderBy=${orderBy}&order=${order}`);

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
        not_indexed_pages: notIndexedPages,
      });
    } catch (err) {
      console.error('Error fetching website details:', err);
      setError('An error occurred while fetching website details');
      setGlobalError('Failed to load website details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property: keyof Page) => {
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
        <Paper>
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
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={() => handleRequestSort(headCell.id)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        maxWidth: isMobile ? 0 : 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: isMobile ? 'none' : 'table-cell',
                      }}
                    >
                      {page.url}
                    </TableCell>
                    <TableCell>
                      {page.indexing_status === indexed ? 'Indexed' : 'Not Indexed'}
                    </TableCell>
                    <TableCell>
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
          <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component="div"
            count={indexingStats.total_pages}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      ) : (
        <Alert severity="info">No pages found for this website.</Alert>
      )}
    </Box>
  );
}