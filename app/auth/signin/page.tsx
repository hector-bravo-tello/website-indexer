'use client';

import { Box, Typography, Button, useMediaQuery, Theme } from '@mui/material';
import Image from "next/image";
import { signIn } from 'next-auth/react';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
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
        height: isMobile ? '30vh' : '100vh',
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
        height: isMobile ? '70vh' : '100vh',
      }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Website Indexer
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center">
          Inicia sesión o regístrate
        </Typography>

        <Box sx={{ mt: 4, width: '100%', maxWidth: 300 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            sx={{ mb: 2 }}
          >
            Continúa con Google
          </Button>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Al continuar, aceptas nuestros{' '}
            <a href="/terms" style={{ color: 'blue' }}>Términos de uso</a> y nuestra{' '}
            <a href="/privacy" style={{ color: 'blue' }}>Política de privacidad</a>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}