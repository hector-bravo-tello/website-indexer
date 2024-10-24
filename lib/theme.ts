// lib/theme.ts
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

declare module '@mui/material/styles' {
  interface Palette {
    customBackground: Palette['primary'];
    customText: Palette['primary'];
  }
  interface PaletteOptions {
    customBackground?: PaletteOptions['primary'];
    customText?: PaletteOptions['primary'];
  }
}

// Create a base theme
const baseTheme = createTheme({
  palette: {
    primary: {
      main: '#4DAEF7',
      light: '#7CC6FE',
      dark: '#2B68F2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0f766e',
      light: '#14b8a6',
      dark: '#0d5b54',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    customBackground: {
      main: '#ffffff',
      light: '#f3f4f6',
      dark: '#e5e7eb',
    },
    customText: {
      main: '#111827',
      light: '#374151',
      dark: '#1f2937',
    },
    background: {
      default: '#f3f4f6',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    subtitle1: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 2.66,
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  mixins: {
    toolbar: {
      minHeight: 64,
    },
  },
});

// Customize the base theme
const customTheme = deepmerge(baseTheme, {
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: baseTheme.palette.background.paper,
          color: baseTheme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${baseTheme.palette.grey[200]}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '0.375rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: baseTheme.palette.primary.dark,
          },
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: baseTheme.palette.secondary.dark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: baseTheme.spacing(3),
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: baseTheme.spacing(3),
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: baseTheme.spacing(3),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '0.375rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '0.5rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: baseTheme.palette.grey[200],
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: '0.375rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: baseTheme.palette.grey[300],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: baseTheme.palette.grey[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: baseTheme.palette.primary.main,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${baseTheme.palette.grey[200]}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: baseTheme.palette.grey[50],
          '.MuiTableCell-root': {
            color: baseTheme.palette.text.secondary,
            fontWeight: 600,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: baseTheme.palette.grey[800],
        },
      },
    },
  },
});

// Make the theme responsive
const theme = responsiveFontSizes(customTheme);

export default theme;