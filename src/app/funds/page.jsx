'use client';

import { useState, useEffect, Suspense } from 'react';
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

function FundsPageContent() {
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
    // ...existing code (the entire previous return block)...
    <>
      {/* ...existing code... */}
    </>
  );
}

export default function FundsPage() {
  return (
    <Suspense fallback={<div style={{textAlign: 'center', padding: 40}}><CircularProgress size={48} /><br/>Loading funds...</div>}>
      <FundsPageContent />
    </Suspense>
  );
}