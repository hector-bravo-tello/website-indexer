'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Grid,
  useTheme,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Timer as TimerIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  ManageSearch as ManageSearchIcon,
  CloudSync as CloudSyncIcon,
  Speed as SpeedIcon,
  ViewInAr as ViewInArIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';

const HomePage = () => {
  const { status } = useSession();
  const theme = useTheme();

  const features = [
    {
      icon: <ViewInArIcon />,
      title: 'Google Search Console Integration',
      description: 'for easy setup'
    },
    {
      icon: <TimerIcon />,
      title: 'Auto-indexing',
      description: 'stop spending hours manually requesting pages to be indexed'
    },
    {
      icon: <ManageSearchIcon />,
      title: 'Bulk-indexing',
      description: 'it reads all pages from your sitemaps and submits for indexing, all at once'
    },
    {
      icon: <EmailIcon />,
      title: 'Email Summary',
      description: 'Email summary every day with details of all pages indexed'
    },
    {
      icon: <SearchIcon />,
      title: 'Manual Submit',
      description: 'Manually submit non-indexed pages if needed'
    },
    {
      icon: <CloudSyncIcon />,
      title: 'Auto Sync',
      description: 'Automatically sync all of your website properties directly from your GSC account'
    },
    {
      icon: <ViewInArIcon />,
      title: 'Easy Interface',
      description: "Easy to use user interface and it's free!"
    },
    {
      icon: <SpeedIcon />,
      title: 'Fast Indexing',
      description: 'Getting indexed fast and improve your website SEO'
    }
  ];

  const ctaLink = status === 'authenticated' ? '/dashboard' : '/auth/signin';

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ 
        position: 'relative',
        pt: { xs: 8, sm: 12, md: 16 },
        pb: { xs: 6, sm: 8 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/images/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.35,
          zIndex: 0
        }
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6} sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h1" sx={{ 
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' }, 
                fontWeight: 700,
                color: 'text.primary',
                mb: 2,
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Website Indexer
              </Typography>
              <Typography variant="h2" sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                mb: 4,
                color: 'text.secondary',
                fontWeight: 400,
                lineHeight: 1.6,
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Struggling to get indexed by Google? Stop wasting time, let this app automatically get your pages indexed in a few hours.
              </Typography>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Link href={ctaLink} passHref>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      borderRadius: 28,
                      px: { xs: 3, sm: 4 },
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.9rem', sm: '1.1rem' },
                      '&:hover': {
                        backgroundColor: 'white',
                        color: theme.palette.primary.main,
                      }
                    }}
                  >
                    Get Indexed Now!
                  </Button>
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                position: 'relative',
                height: { xs: '250px', sm: '300px', md: '400px' },
                width: '100%'
              }}>
                <Image
                  src="/images/get-indexed.png"
                  alt="Get Indexed"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, scrollMarginTop: '64px' }} id="features">
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ 
            textAlign: 'center',
            mb: 1,
            fontWeight: 600,
            fontSize: { xs: '1.75rem', sm: '2.25rem' }
          }}>
            Features
          </Typography>
          <Typography variant="body1" sx={{ 
            textAlign: 'center',
            mb: { xs: 4, md: 6 },
            color: 'text.secondary'
          }}>
            It&quot;s no surprise, that if your pages are not indexed then Google doesn&quot;t know about them.
          </Typography>
          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}>
                  <CardContent sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3
                  }}>
                    <Box sx={{ 
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Get Indexed Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 4, md: 5 }, scrollMarginTop: '64px' }} id="benefits">
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ 
                fontWeight: 600, 
                mb: 3,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Get indexed, drive traffic!
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'text.secondary', 
                mb: 4,
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Optimize your website for search engines. Get indexed and drive more organic traffic.
                Enhance visibility, improve rankings, and grow your audience effectively!
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                position: 'relative',
                height: { xs: '250px', sm: '300px', md: '400px' },
                width: '100%'
              }}>
                <Image
                  src="/images/get-indexed.png"
                  alt="Drive Traffic"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* One-click Section */}
      <Box sx={{ py: { xs: 4, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                position: 'relative',
                height: { xs: '250px', sm: '300px', md: '400px' },
                width: '100%'
              }}>
                <Image
                  src="/images/one-click.png"
                  alt="One-click Indexing"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ 
                fontWeight: 600, 
                mb: 3,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                textAlign: { xs: 'center', md: 'left' }
              }}>
                One-click indexing requests!
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'text.secondary', 
                mb: 4,
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Streamline your website management with one-click indexing requests. 
                Simplify the process of submitting URLs for indexing, ensuring your content 
                is quickly discovered by search engines.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Auto-indexing Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 4, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ 
                fontWeight: 600, 
                mb: 3,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Turn on autopilot, auto indexing!
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'text.secondary', 
                mb: 4,
                textAlign: { xs: 'center', md: 'left' }
              }}>
                Turn on autopilot, auto indexing! Simplify your workflow with 
                automatic URL submissions for indexing. Ensure your content is 
                always up-to-date and discoverable by search engines, boosting 
                your site&quot;s visibility effortlessly.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                position: 'relative',
                height: { xs: '250px', sm: '300px', md: '400px' },
                width: '100%'
              }}>
                <Image
                  src="/images/auto-indexing.png"
                  alt="Auto Indexing"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
