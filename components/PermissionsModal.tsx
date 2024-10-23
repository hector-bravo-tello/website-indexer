// components/PermissionsModal.tsx

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Link, 
  Box, 
  IconButton, 
  Tooltip,
  Snackbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Launch as LaunchIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

interface PermissionsModalProps {
  open: boolean;
  onClose: () => void;
  serviceAccountEmail: string;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  open,
  onClose,
  serviceAccountEmail
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
  ) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(serviceAccountEmail);
      setCopySuccess(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
        Permissions needed for Auto-Indexing
      </DialogTitle>
      <DialogContent>
        <Typography paragraph>
          To activate the service account, please add the following email to your Google Search Console users:
        </Typography>
        <Box sx={{ 
          my: 2, 
          p: 2, 
          bgcolor: 'grey.100', 
          borderRadius: 1, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          justifyContent: 'space-between'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'bold', 
              wordBreak: 'break-all', 
              mr: { xs: 0, sm: 2 },
              mb: { xs: 1, sm: 0 }
            }}
          >
            {serviceAccountEmail || 'Service account email not available'}
          </Typography>
          <Tooltip title="Copy email">
            <IconButton onClick={handleCopyEmail} size="small">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography paragraph>
          The user must be added with Owner permission.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<LaunchIcon />}
          component={Link}
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          fullWidth
          sx={{ mb: 2, textTransform: 'none' }}
        >
          Open Google Search Console
        </Button>
        <Typography variant="body2" color="text.secondary">
          After adding the service account, click the &quot;Refresh Permissions&quot; button to verify it.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, padding: { xs: 2, sm: 1 } }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          fullWidth={isMobile}
          sx={{ mb: { xs: 1, sm: 0 }, textTransform: 'none' }}
        >
          Close
        </Button>
      </DialogActions>
      <Snackbar 
        open={copySuccess} 
        autoHideDuration={3000} 
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopySuccess(false)} severity="success">
          Email copied to clipboard!
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PermissionsModal;