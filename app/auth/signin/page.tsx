// File: app/auth/signin/page.tsx
'use client';

import { Box, Typography, Button } from '@mui/material';
import Image from "next/image";
import { signIn } from 'next-auth/react';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      {/* Left side with image */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Image
          src="/images/background.webp"
          alt="Website Indexer"
          priority
          width={1024}
          height={1300}
        />
      </Box>

      {/* Right side with login form */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Website Indexer
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
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