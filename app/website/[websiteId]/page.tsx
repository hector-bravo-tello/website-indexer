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
  CircularProgress,
  Alert,
  TablePagination,
  TableSortLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Website, Page } from '@/types';
import { useError } from '@/lib/useError';
import IndexingStats from '@/components/IndexingStats';

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
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Page>('url');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [hasMore, setHasMore] = useState(true);

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

      const pagesResponse = await fetch(`/api/websites/${websiteId}/pages?page=${page}&pageSize=${rowsPerPage}&orderBy=${orderBy}&order=${order}`);

      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch website details');
      }

      const pagesData = await pagesResponse.json();
      setPages(pagesData.pages || []);
      setHasMore(pagesData.pages.length === rowsPerPage);
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
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && page === 0) {
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
      <Typography variant="h4" gutterBottom>
        Website Details
      </Typography>

      <IndexingStats websiteId={websiteId} />

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
                      {page.indexing_status}
                    </TableCell>
                    <TableCell>{page.last_indexed_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={-1}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            nextIconButtonProps={{
              disabled: !hasMore,
            }}
          />
        </Paper>
      ) : (
        <Alert severity="info">No pages found for this website.</Alert>
      )}
    </Box>
  );
}