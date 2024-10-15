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
  Snackbar
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

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(serviceAccountEmail);
      setCopySuccess(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCloseCopySuccess = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setCopySuccess(false);
  };

  const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
  ) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Permissions needed for Auto-Indexing</DialogTitle>
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
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', wordBreak: 'break-all', mr: 2 }}>
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
          sx={{ mb: 2 }}
        >
          Open Google Search Console
        </Button>
        <Typography variant="body2" color="text.secondary">
            After adding the service account, click the &quot;Refresh Permissions&quot; button to verify it.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <Snackbar open={copySuccess} autoHideDuration={3000} onClose={handleCloseCopySuccess}>
        <Alert onClose={handleCloseCopySuccess} severity="success" sx={{ width: '100%' }}>
          Email copied to clipboard!
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PermissionsModal;