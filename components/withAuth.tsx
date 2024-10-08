'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';

export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithAuth(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === 'loading') return; // Do nothing while loading
      if (!session && status !== 'loading') {
        router.push('/auth/signin');
      }
    }, [session, status, router]);

    if (status === 'loading') {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      );
    }

    if (status === 'authenticated') {
      return <WrappedComponent {...props} />;
    }

    return null; // Render nothing while redirecting
  };
}
