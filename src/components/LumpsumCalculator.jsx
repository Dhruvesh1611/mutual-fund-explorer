
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Divider, Alert } from '@mui/material';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

function findClosestNAV(navData, date) {
  // Find the NAV entry closest to the given date (on or before)
  const target = dayjs(date, 'DD/MM/YY');
  let closest = null;
  for (let i = navData.length - 1; i >= 0; i--) {
    const navDate = dayjs(navData[i].date, 'DD-MM-YYYY');
    if (navDate.isSameOrBefore(target)) {
      closest = navData[i];
      break;
    }
  }
  return closest;
}

export default function LumpsumCalculator({ navData }) {
  const [amount, setAmount] = useState(10000);
  const [date, setDate] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    setResult(null);
    if (!amount || amount <= 0) {
      setError('Please enter a valid investment amount.');
      return;
    }
    if (!date) {
      setError('Please enter a valid investment date.');
      return;
    }
    const startNav = findClosestNAV(navData, date);
    const endNav = navData[0]; // latest NAV
    if (!startNav || !endNav) {
      setError('Insufficient NAV data for calculation.');
      return;
    }
    const units = amount / parseFloat(startNav.nav);
    const currentValue = units * parseFloat(endNav.nav);
    const gain = currentValue - amount;
    const absReturn = ((currentValue - amount) / amount) * 100;
    const start = dayjs(startNav.date, 'DD-MM-YYYY');
    const end = dayjs(endNav.date, 'DD-MM-YYYY');
    const years = end.diff(start, 'day') / 365.25;
    const annReturn = years > 0 ? (Math.pow(currentValue / amount, 1 / years) - 1) * 100 : 0;
    setResult({
      amount,
      startDate: startNav.date,
      endDate: endNav.date,
      startNav: parseFloat(startNav.nav),
      endNav: parseFloat(endNav.nav),
      units,
      currentValue,
      gain,
      absReturn,
      annReturn,
      years: years.toFixed(2),
    });
  };

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Investment Amount (₹)"
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          inputProps={{ min: 1000, step: 1000 }}
        />
        <TextField
          label="Investment Date (dd/mm/yy)"
          placeholder="dd/mm/yy"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <Button variant="contained" onClick={handleCalculate}>
          Calculate
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {result && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Lumpsum Investment Result
          </Typography>
          <Typography variant="body2">
            Invested: <b>₹{result.amount.toLocaleString()}</b> on <b>{result.startDate}</b> (NAV: ₹{result.startNav})
          </Typography>
          <Typography variant="body2">
            Current Value: <b>₹{result.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b> (NAV: ₹{result.endNav} as of {result.endDate})
          </Typography>
          <Typography variant="body2">
            Gain/Loss: <b>₹{result.gain.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
          </Typography>
          <Typography variant="body2">
            Absolute Return: <b>{result.absReturn.toFixed(2)}%</b>
          </Typography>
          <Typography variant="body2">
            Annualized Return: <b>{result.annReturn.toFixed(2)}%</b> over {result.years} years
          </Typography>
        </Box>
      )}
    </Box>
  );
}
