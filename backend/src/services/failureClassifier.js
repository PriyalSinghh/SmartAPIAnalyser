/**
 * Failure Classifier Service
 *
 * Implements rule-based HTTP failure categorization.
 * Designed to be modular so that advanced rule engines, pattern matchers,
 * or ML models can be plugged in future phases.
 */

const FAILURE_RULES = [
  {
    matcher: (code) => code >= 500 && code <= 599,
    category: 'Server Error',
    severity: 'critical',
    description: 'Internal server failure, unhandled exception, or upstream gateway timeout',
  },
  {
    matcher: (code) => code === 400,
    category: 'Bad Request',
    severity: 'medium',
    description: 'Malformed request syntax, invalid parameters, or payload validation failure',
  },
  {
    matcher: (code) => code === 401,
    category: 'Authentication Error',
    severity: 'high',
    description: 'Missing, expired, or invalid authentication credentials',
  },
  {
    matcher: (code) => code === 403,
    category: 'Authorization Error',
    severity: 'high',
    description: 'Client does not have permission to access the requested resource',
  },
  {
    matcher: (code) => code === 404,
    category: 'Resource Not Found',
    severity: 'low',
    description: 'Requested endpoint or entity does not exist',
  },
  {
    matcher: (code) => code === 429,
    category: 'Rate Limit',
    severity: 'critical',
    description: 'Too many requests sent within a given time window',
  },
  {
    matcher: (code) => code >= 400 && code < 500,
    category: 'Client Error',
    severity: 'medium',
    description: 'Unclassified client-side HTTP request error',
  },
  {
    matcher: (code) => code >= 200 && code < 400,
    category: 'Success',
    severity: 'none',
    description: 'Successful HTTP request',
  },
];

/**
 * Classify a failure based on HTTP status code and optional error message
 * @param {number} statusCode
 * @param {string} [errorMessage]
 * @returns {{ category: string, severity: string, description: string }}
 */
function classifyFailure(statusCode, errorMessage = null) {
  const code = parseInt(statusCode, 10);
  const matchedRule = FAILURE_RULES.find((rule) => rule.matcher(code));

  if (matchedRule) {
    return {
      category: matchedRule.category,
      severity: matchedRule.severity,
      description: matchedRule.description,
    };
  }

  return {
    category: 'Unknown Error',
    severity: 'medium',
    description: 'Unrecognized status code',
  };
}

/**
 * Augment a log object or array of log objects with failure classification metadata
 * @param {object|Array} logOrLogs
 * @returns {object|Array}
 */
function enhanceWithClassification(logOrLogs) {
  if (Array.isArray(logOrLogs)) {
    return logOrLogs.map((log) => enhanceSingleLog(log));
  }
  return enhanceSingleLog(logOrLogs);
}

function enhanceSingleLog(log) {
  if (!log) return log;
  const classification = classifyFailure(log.status_code || log.statusCode, log.error_message || log.errorMessage);
  return {
    ...log,
    failureCategory: classification.category,
    severity: classification.severity,
    failureDescription: classification.description,
  };
}

module.exports = {
  classifyFailure,
  enhanceWithClassification,
  FAILURE_RULES,
};

