'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { 
  ArrowBack, 
  TrendingUp, 
  Calculate,
  Info,
  ShowChart,
  TableChart,
  BusinessCenter,
  Category,
  DateRange,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs';
import Link from 'next/link';
import LumpsumCalculator from '../../../components/LumpsumCalculator';

export default function SchemeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code;

  const [schemeDetails, setSchemeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // SIP Calculator state
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipFrequency, setSipFrequency] = useState('monthly');
  const [sipFromDate, setSipFromDate] = useState(dayjs().subtract(5, 'year'));
  const [sipToDate, setSipToDate] = useState(dayjs());
  const [sipResult, setSipResult] = useState(null);
  const [sipLoading, setSipLoading] = useState(false);
  const [sipMinDate, setSipMinDate] = useState(null); // for restricting start date

  // Returns Calculator state
  const [returnsData, setReturnsData] = useState({
    '1m': null,
    '3m': null,
    '6m': null,
    '1y': null,
  });
  const [returnsLoading, setReturnsLoading] = useState(false);

  useEffect(() => {
    if (code) {
      fetchSchemeDetails();
    }
  }, [code]);

  useEffect(() => {
    if (schemeDetails) {
      fetchAllReturns();
    }
  }, [schemeDetails]);

  const fetchSchemeDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scheme/${code}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheme details');
      }
      
      const data = await response.json();
      setSchemeDetails(data);
      // Set min date for SIP if NAV data exists
      if (data && data.data && data.data.length > 0) {
        // Try to parse the earliest NAV date
        const firstNav = data.data[data.data.length - 1];
        if (firstNav && firstNav.date) {
          setSipMinDate(dayjs(firstNav.date, 'DD-MM-YYYY'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReturns = async () => {
    try {
      setReturnsLoading(true);
      const periods = ['1m', '3m', '6m', '1y'];
      const results = {};
      let successCount = 0;

      // Try to fetch returns with timeout
      const fetchPromises = periods.map(async (period) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(`/api/scheme/${code}/returns?period=${period}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            results[period] = data;
            successCount++;
          } else {
            console.log(`Returns API failed for ${period}:`, response.status);
            results[period] = null;
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log(`Returns API timeout for ${period}`);
          } else {
            console.log(`Error fetching ${period} returns:`, err.message);
          }
          results[period] = null;
        }
      });

      await Promise.allSettled(fetchPromises);
      
      // Only set results if we got at least some data
      if (successCount > 0) {
        setReturnsData(results);
      } else {
        console.log('No returns data available - API may be having issues');
        setReturnsData({
          '1m': null,
          '3m': null,
          '6m': null,
          '1y': null,
        });
      }
      
    } catch (err) {
      console.error('Error fetching returns:', err);
    } finally {
      setReturnsLoading(false);
    }
  };

  const calculateSIP = async () => {
    try {
      setSipLoading(true);
      const request = {
        amount: sipAmount,
        frequency: sipFrequency,
        from: sipFromDate.format('YYYY-MM-DD'),
        to: sipToDate.format('YYYY-MM-DD'),
      };

      const response = await fetch(`/api/scheme/${code}/sip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      // Handle both successful and needs_review responses
      if (response.ok) {
        setSipResult(data);
      } else {
        // Handle error responses
        setSipResult({
          error: data.error || 'Failed to calculate SIP',
          status: 'error',
          ...data
        });
      }
      
    } catch (err) {
      console.error('Error calculating SIP:', err);
      setSipResult({
        error: 'Network error while calculating SIP',
        status: 'error'
      });
    } finally {
      setSipLoading(false);
    }
  };

  // Prepare chart data (optimized)
  const navChartData = schemeDetails ? schemeDetails.data
    .slice(-180) // Reduce to 6 months for better performance
    .reverse()
    .filter((_, index) => index % 2 === 0) // Take every 2nd data point for performance
    .map(item => ({
      date: dayjs(item.date, 'DD-MM-YYYY').format('MMM DD'),
      nav: parseFloat(item.nav),
    })) : [];

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !schemeDetails) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Scheme not found'}
          <Button onClick={() => router.back()} sx={{ ml: 2 }}>
            Go Back
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Mutual Fund Explorer
            </Link>
          </Typography>
          <Link href="/funds" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Button color="inherit" size="small">
              Browse All Funds
            </Button>
          </Link>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Scheme Basic Info - Enhanced */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Typography variant="h4" gutterBottom>
                  {schemeDetails.meta.scheme_name}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                  <Chip 
                    label={schemeDetails.meta.fund_house} 
                    icon={<BusinessCenter />}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    label={schemeDetails.meta.scheme_type} 
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip 
                    label={schemeDetails.meta.scheme_category} 
                    icon={<Category />}
                    color="info"
                    variant="outlined"
                  />
                  <Chip 
                    label={extractCategory(schemeDetails.meta.scheme_name)}
                    color="success"
                    variant="outlined"
                  />
                </Box>

                {/* Additional Metadata */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                    <Info sx={{ mr: 1 }} />
                    Scheme Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Scheme Code
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {schemeDetails.meta.scheme_code}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Fund House
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {schemeDetails.meta.fund_house}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Scheme Type
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {schemeDetails.meta.scheme_type}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Category
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {schemeDetails.meta.scheme_category}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                {schemeDetails.data && schemeDetails.data.length > 0 && (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography variant="h6" gutterBottom display="flex" alignItems="center" justifyContent="center">
                      <DateRange sx={{ mr: 1 }} />
                      Current NAV
                    </Typography>
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                      ₹{schemeDetails.data[0].nav}
                    </Typography>
                    <Typography variant="body2">
                      As of {schemeDetails.data[0].date}
                    </Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={4}>
          {/* NAV Chart - Enhanced */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" gutterBottom display="flex" alignItems="center">
                  <ShowChart sx={{ mr: 1 }} />
                  NAV Trend (Last 6 Months)
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                {navChartData.length > 0 && (
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <LineChart
                      width={650}
                      height={350}
                      series={[
                        {
                          data: navChartData.map(d => d.nav),
                          label: 'NAV (₹)',
                          color: '#1976d2',
                          curve: 'linear',
                        },
                      ]}
                      xAxis={[
                        {
                          scaleType: 'point',
                          data: navChartData.map(d => d.date),
                          tickInterval: (index) => index % Math.ceil(navChartData.length / 8) === 0,
                        },
                      ]}
                      grid={{ vertical: false, horizontal: true }}
                      margin={{ left: 60, right: 30, top: 30, bottom: 60 }}
                    />
                  </Box>
                )}
                
                {navChartData.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="textSecondary">
                      Insufficient data to display chart
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Returns Table - New */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" gutterBottom display="flex" alignItems="center">
                  <TableChart sx={{ mr: 1 }} />
                  Pre-computed Returns
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {returnsLoading && (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={40} />
                  </Box>
                )}
                
                {!returnsLoading && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Period</strong></TableCell>
                          <TableCell align="right"><strong>Simple Return</strong></TableCell>
                          <TableCell align="right"><strong>Annualized</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[
                          { period: '1m', label: '1 Month' },
                          { period: '3m', label: '3 Months' },
                          { period: '6m', label: '6 Months' },
                          { period: '1y', label: '1 Year' },
                        ].map(({ period, label }) => {
                          const data = returnsData[period];
                          return (
                            <TableRow key={period}>
                              <TableCell component="th" scope="row">
                                {label}
                              </TableCell>
                              <TableCell 
                                align="right"
                                sx={{ 
                                  color: data && data.simpleReturn ? 
                                    (data.simpleReturn >= 0 ? 'success.main' : 'error.main') : 
                                    'text.secondary'
                                }}
                              >
                                {data && data.simpleReturn !== null ? 
                                  `${data.simpleReturn.toFixed(2)}%` : 
                                  'N/A'
                                }
                              </TableCell>
                              <TableCell 
                                align="right"
                                sx={{ 
                                  color: data && data.annualizedReturn ? 
                                    (data.annualizedReturn >= 0 ? 'success.main' : 'error.main') : 
                                    'text.secondary'
                                }}
                              >
                                {data && data.annualizedReturn !== null ? 
                                  `${data.annualizedReturn.toFixed(2)}%` : 
                                  'N/A'
                                }
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary">
                    * Returns are calculated based on historical NAV data
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* SIP Calculator - Enhanced */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom display="flex" alignItems="center">
              <Calculate sx={{ mr: 1 }} />
              SIP Calculator
            </Typography>
            <Typography variant="body1" color="textSecondary" mb={3}>
              Calculate your SIP returns and see how your investment would have grown over time
            </Typography>
            <Divider sx={{ mb: 4 }} />
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Investment Parameters
                </Typography>
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="SIP Amount (₹)"
                  type="number"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(Number(e.target.value))}
                  inputProps={{ min: 500, step: 500 }}
                  helperText="Minimum amount: ₹500"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={sipFrequency}
                    onChange={(e) => setSipFrequency(e.target.value)}
                    label="Frequency"
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                  </Select>
                </FormControl>

                <DatePicker
                  label="Start Date"
                  value={sipFromDate}
                  onChange={(newValue) => newValue && setSipFromDate(newValue)}
                  minDate={sipMinDate}
                  maxDate={dayjs().subtract(1, 'month')}
                  format="DD/MM/YY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      helperText: sipMinDate ? `Earliest allowed: ${sipMinDate.format('DD/MM/YY')}` : 'Choose a date from the past',
                    },
                  }}
                />

                <DatePicker
                  label="End Date"
                  value={sipToDate}
                  onChange={(newValue) => newValue && setSipToDate(newValue)}
                  minDate={sipFromDate.add(1, 'month')}
                  maxDate={dayjs()}
                  format="DD/MM/YY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      helperText: 'End date must be after start date',
                    },
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={calculateSIP}
                  disabled={sipLoading}
                  sx={{ mt: 3, py: 2 }}
                  startIcon={sipLoading ? <CircularProgress size={20} /> : <Calculate />}
                >
                  {sipLoading ? 'Calculating...' : 'Calculate SIP Returns'}
                </Button>
              </Grid>

              <Grid item xs={12} md={6}>
                {sipResult ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      SIP Investment Results
                    </Typography>
                    
                    {/* Error or needs_review status */}
                    {(sipResult.error || sipResult.status === 'error') && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Calculation Error:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {sipResult.error}
                        </Typography>
                        {sipResult.firstAvailableDate && (
                          <>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              First available date: {sipResult.firstAvailableDate}
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              sx={{ mt: 1 }}
                              onClick={() => setSipFromDate(dayjs(sipResult.firstAvailableDate))}
                            >
                              Use First Available Date
                            </Button>
                          </>
                        )}
                      </Alert>
                    )}
                    
                    {sipResult.status === 'needs_review' && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Calculation Completed with Issues:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {sipResult.error || 'Some investment dates had missing or invalid NAV data.'}
                        </Typography>
                        {sipResult.summary && (
                          <Box mt={1}>
                            <Typography variant="body2">
                              Successful investments: {sipResult.summary.successfulInvestments} 
                              of {sipResult.summary.totalInvestmentDates}
                            </Typography>
                            {sipResult.summary.skippedInvestments > 0 && (
                              <Typography variant="body2">
                                Skipped: {sipResult.summary.skippedInvestments} dates
                              </Typography>
                            )}
                            {sipResult.summary.invalidNavCount > 0 && (
                              <Typography variant="body2">
                                Invalid NAV: {sipResult.summary.invalidNavCount} dates
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Alert>
                    )}

                    {/* Success results */}
                    {(sipResult.status === 'success' || sipResult.status === 'needs_review') && sipResult.totalInvested && (
                      <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <Typography variant="h5" gutterBottom textAlign="center">
                          Investment Summary
                          {sipResult.status === 'needs_review' && (
                            <Chip 
                              label="Needs Review" 
                              size="small" 
                              color="warning" 
                              sx={{ ml: 1 }} 
                            />
                          )}
                        </Typography>
                        <Divider sx={{ my: 2, bgcolor: 'primary.contrastText', opacity: 0.3 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2">Total Invested:</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₹{sipResult.totalInvested.toLocaleString()}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2">Current Value:</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₹{sipResult.currentValue.toLocaleString()}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2">Total Units:</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {sipResult.totalUnits?.toFixed(3) || '0.000'}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2">Gain/Loss:</Typography>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold"
                              color={sipResult.currentValue - sipResult.totalInvested >= 0 ? 'success.light' : 'error.light'}
                            >
                              ₹{(sipResult.currentValue - sipResult.totalInvested).toLocaleString()}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 2, bgcolor: 'primary.contrastText', opacity: 0.3 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2">Absolute Return:</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="bold" 
                              color={sipResult.absoluteReturn >= 0 ? 'success.light' : 'error.light'}
                            >
                              {sipResult.absoluteReturn?.toFixed(2) || '0.00'}%
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2">Annualized Return:</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="bold" 
                              color={sipResult.annualizedReturn >= 0 ? 'success.light' : 'error.light'}
                            >
                              {sipResult.annualizedReturn?.toFixed(2) || '0.00'}%
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        {/* Calculation Details */}
                        {sipResult.summary && (
                          <Box mt={2}>
                            <Divider sx={{ my: 2, bgcolor: 'primary.contrastText', opacity: 0.3 }} />
                            <Typography variant="body2" textAlign="center">
                              Period: {sipResult.summary.calculationPeriodDays} days 
                              ({sipResult.summary.calculationPeriodYears?.toFixed(2)} years)
                            </Typography>
                            <Typography variant="body2" textAlign="center">
                              End NAV: ₹{sipResult.summary.endNav} (as of {sipResult.summary.endNavDate})
                            </Typography>
                          </Box>
                        )}

                        {/* Lumpsum Investment Calculator */}
                        <Box mt={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                Lumpsum Investment Calculator
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <LumpsumCalculator navData={schemeDetails?.data || []} />
                            </CardContent>
                          </Card>
                        </Box>
                      </Paper>
                    )}
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Calculate sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      SIP Calculator Ready
                    </Typography>
                    <Typography color="textSecondary">
                      Enter your investment parameters and click "Calculate SIP Returns" to see how your investment would have performed.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </LocalizationProvider>
  );
}