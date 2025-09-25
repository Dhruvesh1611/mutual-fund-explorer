'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Search as SearchIcon, TrendingUp, BusinessCenter, Category } from '@mui/icons-material';
import Link from 'next/link';

export default function Home() {
  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    if (appliedSearch) {
      const filtered = schemes.filter(scheme =>
        scheme.schemeName.toLowerCase().includes(appliedSearch.toLowerCase())
      );
      setFilteredSchemes(filtered.slice(0, displayLimit));
      setHasMore(filtered.length > displayLimit);
    } else {
      setFilteredSchemes(schemes.slice(0, displayLimit));
      setHasMore(schemes.length > displayLimit);
    }
  }, [appliedSearch, schemes, displayLimit]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      
      // Fetch with initial limit for faster loading
      const response = await fetch('/api/mf?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch schemes');
      }
      
      const data = await response.json();
      setSchemes(data.data);
      setFilteredSchemes(data.data.slice(0, displayLimit));
      setHasMore(data.hasMore || data.total > displayLimit);
      
      // Fetch remaining data in background if cached
      if (data.cached && data.total > 100) {
        setTimeout(() => {
          fetchAllSchemes();
        }, 1000);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchemes = async () => {
    try {
      const response = await fetch('/api/mf');
      if (response.ok) {
        const data = await response.json();
        setSchemes(data.data);
        console.log(`Loaded all ${data.data.length} schemes in background`);
      }
    } catch (err) {
      console.log('Background fetch failed:', err.message);
    }
  };

  const runSearch = async () => {
    setFiltering(true);
    setAppliedSearch(searchInput);
    setDisplayLimit(50); // Reset display limit
    
    // Brief loading for better UX
    setTimeout(() => {
      setFiltering(false);
    }, 300);
  };

  const clearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setDisplayLimit(50);
  };

  const loadMore = () => {
    setDisplayLimit(prev => prev + 50);
  };

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Mutual Fund Explorer
          </Typography>
          <Link href="/funds" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Button color="inherit" sx={{ mr: 1 }}>
              Browse All Funds
            </Button>
          </Link>
          <Chip 
            label={`${schemes.length} Funds`} 
            color="secondary" 
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box mb={4}>
          <Typography variant="h1" gutterBottom align="center">
            Discover Mutual Funds
          </Typography>
          <Typography variant="body1" color="textSecondary" align="center" mb={4}>
            Explore thousands of mutual funds and calculate your SIP returns
          </Typography>
          
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }}
            gap={3} 
            mb={4}
            maxWidth="600px"
            mx="auto"
          >
            <Link href="/funds?view=fundHouses" passHref style={{ textDecoration: 'none' }}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 8,
                    '& .icon': { transform: 'scale(1.1)' }
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box 
                    className="icon"
                    sx={{ 
                      transition: 'transform 0.3s ease',
                      mb: 2 
                    }}
                  >
                    <BusinessCenter 
                      sx={{ 
                        fontSize: 48, 
                        color: 'primary.main',
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    Browse Fund Houses
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Explore funds by AMC companies like HDFC, ICICI, SBI and more
                  </Typography>
                </CardContent>
              </Card>
            </Link>

            <Link href="/funds?view=categories" passHref style={{ textDecoration: 'none' }}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 8,
                    '& .icon': { transform: 'scale(1.1)' }
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box 
                    className="icon"
                    sx={{ 
                      transition: 'transform 0.3s ease',
                      mb: 2 
                    }}
                  >
                    <Category 
                      sx={{ 
                        fontSize: 48, 
                        color: 'secondary.main',
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    Browse Categories
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Discover funds by type: Equity, Debt, Hybrid, ELSS and more
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Box>
          
          <Box display="flex" gap={2} mb={3}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search mutual funds..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchInput && runSearch()}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            <Button 
              variant="contained" 
              onClick={runSearch}
              disabled={filtering || !searchInput}
              size="large"
              sx={{ minWidth: '120px' }}
              startIcon={filtering ? <CircularProgress size={16} /> : <SearchIcon />}
            >
              {filtering ? 'Searching...' : 'Search'}
            </Button>
          </Box>
          
          {(searchInput || appliedSearch) && (
            <Box mb={2} display="flex" gap={2} alignItems="center">
              {appliedSearch && searchInput !== appliedSearch && (
                <Typography variant="body2" color="warning.main">
                  Press Enter or click "Search" to apply: "{searchInput}"
                </Typography>
              )}
              {appliedSearch && (
                <Chip 
                  label={`Search: "${appliedSearch}"`}
                  color="primary"
                  variant="outlined"
                  onDelete={clearSearch}
                />
              )}
            </Box>
          )}
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={60} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            <Button onClick={fetchSchemes} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        {!loading && !error && (
          <>
            <Box mb={3}>
              <Typography variant="body2" color="textSecondary">
                Showing {filteredSchemes.length} of {schemes.length} mutual funds
                {appliedSearch && ` for "${appliedSearch}"`}
              </Typography>
            </Box>

            <Box 
              display="grid" 
              gridTemplateColumns={{
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              }}
              gap={3}
            >
              {filteredSchemes.map((scheme) => (
                <Box key={scheme.schemeCode}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{ 
                          fontSize: '1rem', 
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {scheme.schemeName}
                      </Typography>
                      
                      <Chip 
                        label={`Code: ${scheme.schemeCode}`}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                      
                      <Box mt="auto">
                        <Link href={`/scheme/${scheme.schemeCode}`} passHref>
                          <Button 
                            variant="contained" 
                            fullWidth
                            size="small"
                          >
                            View Details & SIP Calculator
                          </Button>
                        </Link>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>

            {hasMore && (
              <Box textAlign="center" mt={4}>
                <Button 
                  variant="outlined" 
                  onClick={loadMore}
                  size="large"
                >
                  Load More Funds
                </Button>
              </Box>
            )}

            {filteredSchemes.length === 0 && appliedSearch && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" gutterBottom>
                  No funds found
                </Typography>
                <Typography color="textSecondary">
                  Try adjusting your search term
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}