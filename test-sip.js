// Test SIP calculation with sample data
import { calculateSIP } from './src/lib/calculations.js';
import dayjs from 'dayjs';

// Sample NAV data for testing
const sampleNavData = [
  { date: '01-01-2023', nav: '100.00' },
  { date: '02-01-2023', nav: '101.00' },
  { date: '03-01-2023', nav: '99.50' },
  { date: '01-02-2023', nav: '102.00' },
  { date: '02-02-2023', nav: '103.50' },
  { date: '01-03-2023', nav: '105.00' },
  { date: '01-04-2023', nav: '0.00000' }, // Invalid NAV
  { date: '01-05-2023', nav: '108.00' },
  { date: '01-06-2023', nav: '110.50' }
];

// Test Case 1: Monthly SIP with valid data
console.log('=== Test Case 1: Monthly SIP (Valid Data) ===');
const monthlyRequest = {
  amount: 5000,
  frequency: 'monthly',
  from: '2023-01-01',
  to: '2023-06-01'
};

const monthlyResult = calculateSIP(sampleNavData, monthlyRequest);
console.log('Result:', JSON.stringify(monthlyResult, null, 2));

// Test Case 2: SIP with insufficient data
console.log('\n=== Test Case 2: SIP with Insufficient Data ===');
const insufficientDataRequest = {
  amount: 5000,
  frequency: 'monthly',
  from: '2020-01-01',
  to: '2020-06-01'
};

const insufficientResult = calculateSIP(sampleNavData, insufficientDataRequest);
console.log('Result:', JSON.stringify(insufficientResult, null, 2));

// Test Case 3: SIP with some invalid NAVs
console.log('\n=== Test Case 3: SIP with Invalid NAVs ===');
const invalidNavRequest = {
  amount: 5000,
  frequency: 'monthly',
  from: '2023-01-01',
  to: '2023-05-01'
};

const invalidNavResult = calculateSIP(sampleNavData, invalidNavRequest);
console.log('Result:', JSON.stringify(invalidNavResult, null, 2));

// Test Case 4: Daily SIP (short period)
console.log('\n=== Test Case 4: Daily SIP (Short Period) ===');
const dailyRequest = {
  amount: 1000,
  frequency: 'daily',
  from: '2023-01-01',
  to: '2023-01-05'
};

const dailyResult = calculateSIP(sampleNavData, dailyRequest);
console.log('Result:', JSON.stringify(dailyResult, null, 2));