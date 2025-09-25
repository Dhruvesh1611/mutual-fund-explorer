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
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  TrendingUp, 
  ExpandMore,
  BusinessCenter,
  Category,
  Assessment,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function FundsPage() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  
  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter form state (not applied until "Run" is clicked)
  const [searchInput, setSearchInput] = useState('');
  const [selectedFundHouseInput, setSelectedFundHouseInput] = useState('');
  const [selectedCategoryInput, setSelectedCategoryInput] = useState('');
  
  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    fundHouse: '',
    category: ''
  });
  
  const [expandedPanel, setExpandedPanel] = useState(
    viewParam === 'categories' ? 'categories' : 
    viewParam === 'fundHouses' ? 'fundHouses' : 'fundHouses'
  );
  const [displayLimit, setDisplayLimit] = useState(100);
  const [hasMore, setHasMore] = useState(false);
  const [filtering, setFiltering] = useState(false);

  // Grouped data
  const [fundHouses, setFundHouses] = useState({});
  const [categories, setCategories] = useState({});
  const [fundHousesList, setFundHousesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    if (schemes.length > 0) {
      groupSchemes();
    }
  }, [schemes]);

  // Apply filters only when appliedFilters changes
  useEffect(() => {
    applyFilters();
  }, [appliedFilters, schemes, displayLimit]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from cache first with a reasonable limit
      let response = await fetch('/api/mf?limit=200');
      
      if (!response.ok) {
        throw new Error('Failed to fetch schemes');
      }
      
      let data = await response.json();
      
      // If cached data is available but incomplete, fetch all in background
      if (data.cached && data.hasMore) {
        setSchemes(data.data);
        
        // Fetch complete data in background
        setTimeout(async () => {
          try {
            const fullResponse = await fetch('/api/mf');
            if (fullResponse.ok) {
              const fullData = await fullResponse.json();
              setSchemes(fullData.data);
              console.log(`Background loaded ${fullData.data.length} schemes`);
            }
          } catch (err) {
            console.log('Background fetch failed:', err.message);
          }
        }, 1000);
      } else {
        setSchemes(data.data);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const groupSchemes = () => {
    const fundHousesMap = {};
    const categoriesMap = {};
    
    schemes.forEach(scheme => {
      // Extract fund house from scheme name (first part before '-')
      const fundHouse = scheme.schemeName.split('-')[0].trim();
      const category = extractCategory(scheme.schemeName);
      
      // Group by fund house
      if (!fundHousesMap[fundHouse]) {
        fundHousesMap[fundHouse] = [];
      }
      fundHousesMap[fundHouse].push(scheme);
      
      // Group by category
      if (!categoriesMap[category]) {
        categoriesMap[category] = [];
      }
      categoriesMap[category].push(scheme);
    });

    setFundHouses(fundHousesMap);
    setCategories(categoriesMap);
    setFundHousesList(Object.keys(fundHousesMap).sort());
    setCategoriesList(Object.keys(categoriesMap).sort());
  };

  const extractCategory = (schemeName) => {
    const name = schemeName.toLowerCase();
    
    if (name.includes('equity') || name.includes('stock')) return 'Equity';
    if (name.includes('debt') || name.includes('bond') || name.includes('income')) return 'Debt';
    if (name.includes('hybrid') || name.includes('balanced')) return 'Hybrid';
    if (name.includes('liquid') || name.includes('money market')) return 'Liquid/Money Market';
    if (name.includes('elss') || name.includes('tax saving')) return 'ELSS';
    if (name.includes('index') || name.includes('etf')) return 'Index/ETF';
    if (name.includes('international') || name.includes('global')) return 'International';
    if (name.includes('gold') || name.includes('commodity')) return 'Commodity';
    
    return 'Others';
  };

  const applyFilters = () => {
    let filtered = schemes;

    if (appliedFilters.search) {
      filtered = filtered.filter(scheme =>
        scheme.schemeName.toLowerCase().includes(appliedFilters.search.toLowerCase())
      );
    }

    if (appliedFilters.fundHouse) {
      filtered = filtered.filter(scheme => {
        const fundHouse = scheme.schemeName.split('-')[0].trim();
        return fundHouse === appliedFilters.fundHouse;
      });
    }

    if (appliedFilters.category) {
      filtered = filtered.filter(scheme => {
        const category = extractCategory(scheme.schemeName);
        return category === appliedFilters.category;
      });
    }

    setFilteredSchemes(filtered.slice(0, displayLimit));
    setHasMore(filtered.length > displayLimit);
  };

  const runFilters = async () => {
    setFiltering(true);
    
    // Set applied filters to trigger useEffect
    setAppliedFilters({
      search: searchInput,
      fundHouse: selectedFundHouseInput,
      category: selectedCategoryInput
    });
    
    // Reset display limit when applying new filters
    setDisplayLimit(100);
    
    // Simulate brief loading for better UX
    setTimeout(() => {
      setFiltering(false);
    }, 300);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSelectedFundHouseInput('');
    setSelectedCategoryInput('');
    setAppliedFilters({
      search: '',
      fundHouse: '',
      category: ''
    });
    setDisplayLimit(100);
  };

  const hasActiveFilters = searchInput || selectedFundHouseInput || selectedCategoryInput;
  const hasAppliedFilters = appliedFilters.search || appliedFilters.fundHouse || appliedFilters.category;

  const loadMore = () => {
    setDisplayLimit(prev => prev + 50);
  };

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Mutual Fund Explorer
            </Link>
          </Typography>
          <Chip 
            label={`${schemes.length} Total Funds`} 
            color="secondary" 
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box mb={4} textAlign="center">
          <Typography variant="h2" gutterBottom>
            Explore Mutual Funds
          </Typography>
          <Typography variant="h6" color="textSecondary" mb={4}>
            Browse funds by categories and fund houses
          </Typography>
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
            {/* Search and Filters */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Filter Mutual Funds
              </Typography>
              
              <Box mb={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search mutual funds..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Fund House</InputLabel>
                    <Select
                      value={selectedFundHouseInput}
                      onChange={(e) => setSelectedFundHouseInput(e.target.value)}
                      label="Fund House"
                    >
                      <MenuItem value="">All Fund Houses</MenuItem>
                      {fundHousesList.map(house => (
                        <MenuItem key={house} value={house}>{house}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategoryInput}
                      onChange={(e) => setSelectedCategoryInput(e.target.value)}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categoriesList.map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Filter Action Buttons */}
              <Box mt={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <Button 
                  variant="contained" 
                  onClick={runFilters}
                  disabled={filtering || !hasActiveFilters}
                  startIcon={filtering ? <CircularProgress size={16} /> : <SearchIcon />}
                  size="large"
                >
                  {filtering ? 'Filtering...' : 'Run Filters'}
                </Button>
                
                <Button 
                  variant="outlined" 
                  onClick={clearAllFilters}
                  disabled={filtering}
                  size="large"
                >
                  Clear All
                </Button>

                {hasAppliedFilters && (
                  <Chip 
                    label="Filters Applied" 
                    color="primary" 
                    variant="outlined"
                    onDelete={clearAllFilters}
                  />
                )}
              </Box>

              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  {hasAppliedFilters ? (
                    <>Showing {filteredSchemes.length} filtered results of {schemes.length} total funds</>
                  ) : (
                    <>Ready to filter {schemes.length} mutual funds</>
                  )}
                </Typography>
                
                {hasActiveFilters && !hasAppliedFilters && (
                  <Typography variant="body2" color="warning.main">
                    Click "Run Filters" to apply your selections
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Browse by Fund Houses */}
            <Accordion 
              expanded={expandedPanel === 'fundHouses'} 
              onChange={handlePanelChange('fundHouses')}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center">
                  <BusinessCenter sx={{ mr: 2 }} />
                  <Typography variant="h6">
                    Browse by Fund Houses ({fundHousesList.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {fundHousesList.map(house => (
                    <Grid item xs={12} sm={6} md={4} key={house}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 3,
                          }
                        }}
                        onClick={() => {
                          setSelectedFundHouseInput(house);
                          setAppliedFilters(prev => ({
                            ...prev,
                            fundHouse: house
                          }));
                          setExpandedPanel(false);
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {house}
                          </Typography>
                          <Chip 
                            label={`${fundHouses[house]?.length || 0} Funds`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Browse by Categories */}
            <Accordion 
              expanded={expandedPanel === 'categories'} 
              onChange={handlePanelChange('categories')}
              sx={{ mb: 4 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center">
                  <Category sx={{ mr: 2 }} />
                  <Typography variant="h6">
                    Browse by Categories ({categoriesList.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {categoriesList.map(category => (
                    <Grid item xs={12} sm={6} md={4} key={category}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 3,
                          }
                        }}
                        onClick={() => {
                          setSelectedCategoryInput(category);
                          setAppliedFilters(prev => ({
                            ...prev,
                            category: category
                          }));
                          setExpandedPanel(false);
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {category}
                          </Typography>
                          <Chip 
                            label={`${categories[category]?.length || 0} Funds`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Filtered Results */}
            {hasAppliedFilters && (
              <>
                <Box mb={3}>
                  <Typography variant="h5" gutterBottom display="flex" alignItems="center">
                    <Assessment sx={{ mr: 1 }} />
                    Search Results
                  </Typography>
                  <Divider />
                </Box>

                {filteredSchemes.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Typography variant="h6" gutterBottom>
                      No funds found
                    </Typography>
                    <Typography color="textSecondary">
                      Try adjusting your search criteria
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {filteredSchemes.map((scheme) => (
                      <Grid item xs={12} sm={6} md={4} key={scheme.schemeCode}>
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
                                fontSize: '0.95rem', 
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                minHeight: '3.9rem',
                              }}
                            >
                              {scheme.schemeName}
                            </Typography>
                            
                            <Box mb={2}>
                              <Chip 
                                label={scheme.schemeName.split('-')[0].trim()}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                              />
                              <Chip 
                                label={extractCategory(scheme.schemeName)}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ mb: 1 }}
                              />
                            </Box>
                            
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
                      </Grid>
                    ))}
                  </Grid>
                )}
                
                {hasMore && (
                  <Box textAlign="center" mt={4}>
                    <Button 
                      variant="outlined" 
                      onClick={loadMore}
                      size="large"
                    >
                      Load More Results ({Math.min(50, hasMore ? 50 : 0)} more)
                    </Button>
                  </Box>
                )}
              </>
            )}

            {!hasAppliedFilters && (
              <Box textAlign="center" py={6}>
                <Typography variant="h5" gutterBottom>
                  Start Exploring
                </Typography>
                <Typography color="textSecondary" mb={4}>
                  Use the search bar above or browse by fund houses and categories to find mutual funds
                </Typography>
                <Box display="flex" justifyContent="center" gap={2}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setExpandedPanel('fundHouses')}
                    startIcon={<BusinessCenter />}
                  >
                    Browse Fund Houses
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => setExpandedPanel('categories')}
                    startIcon={<Category />}
                  >
                    Browse Categories
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}