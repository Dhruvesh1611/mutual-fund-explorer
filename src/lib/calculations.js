import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

export const calculateReturns = (
  navData,
  period,
  fromDate,
  toDate
) => {
  if (!navData || navData.length === 0) return null;

  // Sort NAV data by date (newest first)
  const sortedNavData = navData.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let startDate;
  let endDate;

  if (period) {
    // Calculate dates based on period using the latest available data
    const latestDate = dayjs(sortedNavData[0].date, 'DD-MM-YYYY');
    endDate = sortedNavData[0].date;
    
    switch (period) {
      case '1m':
        startDate = latestDate.subtract(1, 'month').format('DD-MM-YYYY');
        break;
      case '3m':
        startDate = latestDate.subtract(3, 'month').format('DD-MM-YYYY');
        break;
      case '6m':
        startDate = latestDate.subtract(6, 'month').format('DD-MM-YYYY');
        break;
      case '1y':
        startDate = latestDate.subtract(1, 'year').format('DD-MM-YYYY');
        break;
      default:
        startDate = latestDate.subtract(1, 'year').format('DD-MM-YYYY');
    }
  } else if (fromDate && toDate) {
    startDate = dayjs(fromDate).format('DD-MM-YYYY');
    endDate = dayjs(toDate).format('DD-MM-YYYY');
  } else {
    return null;
  }

  // Find NAV values closest to start and end dates
  const startNav = findClosestNAV(sortedNavData, startDate);
  const endNav = findClosestNAV(sortedNavData, endDate);

  if (!startNav || !endNav) return null;

  const startValue = parseFloat(startNav.nav);
  const endValue = parseFloat(endNav.nav);
  
  const simpleReturn = ((endValue - startValue) / startValue) * 100;
  
  // Calculate annualized return if period is >= 30 days
  const daysDiff = dayjs(endDate, 'DD-MM-YYYY').diff(dayjs(startDate, 'DD-MM-YYYY'), 'days');
  let annualizedReturn;
  
  if (daysDiff >= 30) {
    const years = daysDiff / 365.25;
    annualizedReturn = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  }

  return {
    startDate: startNav.date,
    endDate: endNav.date,
    startNAV: startValue,
    endNAV: endValue,
    simpleReturn,
    annualizedReturn
  };
};

export const calculateSIP = (
  navData,
  request
) => {
  if (!navData || navData.length === 0) {
    return {
      error: 'No NAV data available',
      status: 'needs_review'
    };
  }

  // Sort NAV data by date (oldest first for SIP calculation)
  const sortedNavData = navData.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const startDate = dayjs(request.from);
  const endDate = dayjs(request.to);
    let actualStartDate = startDate;
    let currentDate = actualStartDate;
  
  let totalInvested = 0;
  let totalUnits = 0;
  const investmentLog = [];
  let skippedInvestments = 0;
  let invalidNavCount = 0;

  // Check if we have sufficient data coverage
  const firstAvailableDate = dayjs(sortedNavData[0].date, 'DD-MM-YYYY');
  const lastAvailableDate = dayjs(sortedNavData[sortedNavData.length - 1].date, 'DD-MM-YYYY');
  
    // If startDate is before first available NAV, adjust to first available NAV
    if (startDate.isBefore(firstAvailableDate)) {
      actualStartDate = firstAvailableDate;
    }

  // Generate investment dates based on frequency
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    const investmentDateStr = currentDate.format('DD-MM-YYYY');
    
    // Find NAV for this date (or nearest earlier available NAV)
    const navEntry = findEarlierOrEqualNAV(sortedNavData, investmentDateStr);
    
    if (navEntry) {
      const nav = parseFloat(navEntry.nav);
      
      // Handle edge case: Invalid NAV (0.00000 or negative)
      if (nav <= 0.00000) {
        invalidNavCount++;
        investmentLog.push({
          date: investmentDateStr,
          status: 'skipped',
          reason: 'Invalid NAV',
          nav: nav,
          amount: request.amount,
          units: 0
        });
      } else {
        // Valid NAV - calculate units
        const units = request.amount / nav;
        totalInvested += request.amount;
        totalUnits += units;
        
        investmentLog.push({
          date: investmentDateStr,
          status: 'invested',
          navDate: navEntry.date,
          nav: nav,
          amount: request.amount,
          units: units
        });
      }
    } else {
      // No NAV data available for this date
      skippedInvestments++;
      investmentLog.push({
        date: investmentDateStr,
        status: 'skipped',
        reason: 'No NAV data available',
        amount: request.amount,
        units: 0
      });
    }

    // Move to next investment date based on frequency
    switch (request.frequency) {
      case 'daily':
        currentDate = currentDate.add(1, 'day');
        break;
      case 'weekly':
        currentDate = currentDate.add(1, 'week');
        break;
      case 'monthly':
        currentDate = currentDate.add(1, 'month');
        break;
    }
  }

  // Check if we have any successful investments
  if (totalInvested === 0) {
    return {
      error: 'No successful investments - all dates had invalid or missing NAV data',
      status: 'needs_review',
      invalidNavCount,
      skippedInvestments,
      investmentLog: investmentLog.slice(0, 10) // Show first 10 for debugging
    };
  }

  // Get end NAV (latest available NAV on or before end date)
  const endNavEntry = findEarlierOrEqualNAV(sortedNavData, endDate.format('DD-MM-YYYY'));
  
  if (!endNavEntry) {
    return {
      error: 'No NAV data available for end date calculation',
      status: 'needs_review',
      endDate: endDate.format('YYYY-MM-DD')
    };
  }

  const endNav = parseFloat(endNavEntry.nav);
  
  if (endNav <= 0.00000) {
    return {
      error: 'Invalid end NAV for value calculation',
      status: 'needs_review',
      endNav
    };
  }

  // Calculate final values
  const currentValue = totalUnits * endNav;
  const absoluteReturn = ((currentValue - totalInvested) / totalInvested) * 100;
  
  // Calculate annualized return
  const totalDays = endDate.diff(startDate, 'days');
  const years = totalDays / 365.25;
  let annualizedReturn = 0;
  
  if (years > 0 && totalInvested > 0) {
    annualizedReturn = (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100;
  }

  // Determine if calculation needs review
  const needsReview = (skippedInvestments > 0 || invalidNavCount > 0) && 
                     (skippedInvestments + invalidNavCount) > investmentLog.length * 0.1; // More than 10% issues

  return {
    totalInvested,
    currentValue,
    totalUnits,
    absoluteReturn,
    annualizedReturn,
    status: needsReview ? 'needs_review' : 'success',
    summary: {
      totalInvestmentDates: investmentLog.length,
      successfulInvestments: investmentLog.filter(log => log.status === 'invested').length,
      skippedInvestments,
      invalidNavCount,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      endNavDate: endNavEntry.date,
      endNav,
      calculationPeriodDays: totalDays,
      calculationPeriodYears: years
    },
    // Include investment log for first few entries (for transparency)
    investmentSample: investmentLog.slice(0, 5)
  };
};

const findClosestNAV = (navData, targetDate) => {
  const target = dayjs(targetDate, 'DD-MM-YYYY');
  
  let closest = null;
  let closestDiff = Infinity;

  for (const nav of navData) {
    const navDate = dayjs(nav.date, 'DD-MM-YYYY');
    const diff = Math.abs(navDate.diff(target, 'days'));
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = nav;
    }
  }

  return closest;
};

/**
 * Find NAV for exact date or nearest earlier available NAV
 * This is crucial for SIP calculations as per Task 3 requirements
 */
const findEarlierOrEqualNAV = (navData, targetDate) => {
  const target = dayjs(targetDate, 'DD-MM-YYYY');
  
  let bestMatch = null;
  let smallestGap = Infinity;

  // Look for exact match or nearest earlier date
  for (const nav of navData) {
    const navDate = dayjs(nav.date, 'DD-MM-YYYY');
    
    // Only consider dates that are on or before the target date
    if (navDate.isSameOrBefore(target)) {
      const daysDiff = target.diff(navDate, 'days');
      
      if (daysDiff < smallestGap) {
        smallestGap = daysDiff;
        bestMatch = nav;
      }
    }
  }

  return bestMatch;
};