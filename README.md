# Mutual Fund Explorer with SIP Calculator

A comprehensive Next.js application for exploring mutual funds and calculating SIP (Systematic Investment Plan) returns using real-time data from MFAPI.in.

## Features

### Backend API Routes
- **GET /api/mf** - Fetches and caches all mutual fund schemes
- **GET /api/scheme/[code]** - Returns detailed scheme information and NAV history
- **GET /api/scheme/[code]/returns** - Calculates returns for specified periods (1m|3m|6m|1y) or custom date ranges
- **POST /api/scheme/[code]/sip** - Calculates SIP returns with comprehensive metrics

### Frontend Features
- **Scheme Listing**: Browse and search through thousands of mutual funds
- **Scheme Details**: View fund metadata, NAV trends, and performance charts
- **Returns Calculator**: Calculate returns for different time periods
- **SIP Calculator**: Calculate SIP returns with customizable parameters
- **Interactive Charts**: Visualize NAV trends using MUI Charts
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: Material UI (MUI) v6
- **Charts**: MUI X Charts
- **Date Handling**: Day.js with MUI Date Pickers
- **API Calls**: Axios
- **Caching**: Node-cache for server-side caching
- **TypeScript**: Full type safety throughout the application

## API Endpoints

### 1. List All Schemes
```
GET /api/mf
```
Returns paginated list of all mutual fund schemes with caching.

### 2. Scheme Details
```
GET /api/scheme/{SCHEME_CODE}
```
Returns complete scheme details including NAV history.

### 3. Returns Calculator
```
GET /api/scheme/{SCHEME_CODE}/returns?period=1y
GET /api/scheme/{SCHEME_CODE}/returns?from=2020-01-01&to=2023-12-31
```
Calculates simple and annualized returns for given periods.

### 4. SIP Calculator
```
POST /api/scheme/{SCHEME_CODE}/sip
Content-Type: application/json

{
  "amount": 5000,
  "frequency": "monthly",
  "from": "2020-01-01",
  "to": "2023-12-31"
}
```
Returns comprehensive SIP calculation including total invested, current value, units, and returns.

## Installation & Setup

```bash
# Clone and setup
cd mutual-fund-explorer
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. **Browse Funds**: Search and filter through the complete list of mutual funds
2. **View Details**: Click on any fund to see detailed information and NAV charts
3. **Calculate Returns**: Use the returns calculator to see performance over different periods
4. **SIP Planning**: Use the SIP calculator to plan your systematic investments

## Data Source

This application uses the public API from [MFAPI.in](https://www.mfapi.in/) which provides:
- Complete list of mutual fund schemes
- Historical NAV data
- Real-time updates

## Caching Strategy

- Scheme list: Cached for 1 hour
- Scheme details: Cached for 30 minutes
- Calculated returns: Cached for 30 minutes
- SIP calculations: Cached per unique parameter combination

## Performance Features

- Server-side caching for API responses
- Lazy loading of scheme details
- Optimized chart rendering
- Responsive grid layouts
- Search-based filtering

## Future Enhancements

- Portfolio tracking
- Comparison tools
- Goal-based planning
- Export functionality
- Advanced charting options

---

Built with ❤️ using Next.js and Material UI
