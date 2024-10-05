// components/ErrorHandler.tsx
import React from 'react';
import { Alert, AlertTitle, Snackbar } from '@mui/material';

interface ErrorHandlerProps {
  error: string | null;
  onClose: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ error, onClose }) => {
  return (
    <Snackbar open={!!error} autoHideDuration={6000} onClose={onClose}>
      <Alert onClose={onClose} severity="error" sx={{ width: '100%' }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    </Snackbar>
  );
};

export default ErrorHandler;