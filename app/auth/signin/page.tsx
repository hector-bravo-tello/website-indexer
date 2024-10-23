'use client';

import { Box, Typography, Button, useMediaQuery, Theme } from '@mui/material';
import Image from "next/image";
import Link from "next/link";
import { signIn } from 'next-auth/react';
import { Google as GoogleIcon, Home as HomeIcon } from '@mui/icons-material';

export default function LoginPage() {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      height: '100vh',
    }}>
      {/* Left side with image */}
      <Box sx={{ 
        flex: isMobile ? 'none' : 1, 
        position: 'relative',
        height: isMobile ? '50vh' : '100vh',
      }}>
        <Image
          src="/images/background.webp"
          alt="Website Indexer"
          priority
          layout="fill"
          objectFit="cover"
        />
      </Box>

      {/* Right side with login form */}
      <Box sx={{ 
        flex: isMobile ? 'none' : 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        p: 4,
        height: isMobile ? '50vh' : '100vh',
      }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Website Indexer
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center">
          Sign in or Register
        </Typography>

        <Box sx={{ mt: 4, width: '100%', maxWidth: 300 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            sx={{ 
              mb: 2,
              textTransform: 'none',
              fontWeight: 500,
              transition: 'all 0.3s ease',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-1px)',
                bgcolor: 'primary.light',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: 'none',
              }
            }}
          >
            Continue with Google
          </Button>

          <Link href="/" passHref>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<HomeIcon />}
              sx={{ 
                mb: 3,
                textTransform: 'none',
                fontWeight: 500,
                color: 'primary.main',
                borderColor: 'primary.main',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  bgcolor: 'primary.light',
                  color: 'white',
                  borderColor: 'primary.main',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: 'none',
                }
              }}
            >
              Back to home
            </Button>
          </Link>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            By continuing, you agree to our{' '}
            <Link href="/terms" style={{ color: 'blue' }}>Terms of Use</Link> and{' '}
            <Link href="/privacy" style={{ color: 'blue' }}>Privacy Policy</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}