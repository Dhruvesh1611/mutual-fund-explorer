/**
 * @typedef {Object} MutualFundScheme
 * @property {number} schemeCode
 * @property {string} schemeName
 */

/**
 * @typedef {Object} SchemeDetails
 * @property {Object} meta
 * @property {string} meta.scheme_type
 * @property {string} meta.scheme_category
 * @property {number} meta.scheme_code
 * @property {string} meta.scheme_name
 * @property {string} meta.fund_house
 * @property {NAVData[]} data
 * @property {string} status
 */

/**
 * @typedef {Object} NAVData
 * @property {string} date
 * @property {string} nav
 */

/**
 * @typedef {Object} ReturnsCalculation
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} startNAV
 * @property {number} endNAV
 * @property {number} simpleReturn
 * @property {number} [annualizedReturn]
 */

/**
 * @typedef {Object} SIPCalculationRequest
 * @property {number} amount
 * @property {'monthly' | 'weekly' | 'daily'} frequency
 * @property {string} from
 * @property {string} to
 */

/**
 * @typedef {Object} SIPCalculationResult
 * @property {number} totalInvested
 * @property {number} currentValue
 * @property {number} totalUnits
 * @property {number} absoluteReturn
 * @property {number} annualizedReturn
 */

/**
 * @typedef {'1m' | '3m' | '6m' | '1y'} Period
 */

// Export empty object to make this a module
export {};