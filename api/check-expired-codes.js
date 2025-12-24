const https = require('https')
const { logAuditEvent } = require('./utils/audit-log')

/**
 * Check for expired gift codes by scraping kingshot.net/gift-codes
 * This function should be scheduled to run periodically (e.g., every hour)
 * 
 * Dates from kingshot.net are in UTC timezone (Z suffix)
 * Example: "2026-01-05T00:00:00.000Z" or "2025-12-24T23:59:00.000Z"
 * 
 * To configure as a scheduled function in Netlify:
 * 1. Go to Site Settings > Functions > Scheduled Functions
 * 2. Add new scheduled function
 * 3. Function: check-expired-codes
 * 4. Schedule: "0 * * * *" (every hour in UTC)
 * 
 * Or use external cron service (e.g., cron-job.org) to call this endpoint
 */
async function scrapeGiftCodes() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kingshot.net',
      path: '/gift-codes',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const codes = []
          const foundCodes = new Set()
          
          // Extract codes from escaped JSON
          const codePatternEscaped = /\\"code\\":\\"([A-Z0-9]{4,20})\\"([\s\S]{0,2000}?)\\"isActive\\":(true|false)([\s\S]{0,2000}?)\\"expiresAt\\":(null|\\"([^"]*)\\")/g
          let match
          
          while ((match = codePatternEscaped.exec(data)) !== null) {
            const code = match[1]
            if (foundCodes.has(code)) continue
            foundCodes.add(code)
            
            const isActive = match[3] === 'true'
            let expiresAt = match[5] === 'null' ? null : match[6]
            
            // Handle Next.js date format: $D2026-01-05T00:00:00.000Z
            if (expiresAt && typeof expiresAt === 'string' && expiresAt.startsWith('$D')) {
              expiresAt = expiresAt.substring(2) // Remove $D prefix
            }
            
            codes.push({
              code,
              isActive,
              expiresAt,
              // Parse expiration date for comparison
              expirationDate: expiresAt ? new Date(expiresAt) : null
            })
          }
          
          resolve(codes)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.end()
  })
}

/**
 * Check if a code is expired based on UTC timestamp
 * Dates from kingshot.net are in UTC, so we compare in UTC
 */
function isCodeExpired(expirationDate) {
  if (!expirationDate) return false
  
  // Get current time in UTC
  const now = new Date()
  const nowUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  )
  
  // Compare UTC timestamps
  return expirationDate.getTime() < nowUTC
}

/**
 * Main handler - only accessible via scheduled function
 * Manual calls are not allowed for security
 */
// Netlify handler
const handler = async (event, context) => {
  // Only allow scheduled function calls (no httpMethod)
  // Block all manual HTTP requests
  if (event.httpMethod) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Forbidden',
        message: 'This function can only be called via scheduled execution'
      })
    }
  }

  try {
    console.log('Checking for expired codes...')
    const codes = await scrapeGiftCodes()
    
    const now = new Date()
    const expiredCodes = []
    const activeCodes = []
    
    codes.forEach(codeData => {
      const { code, isActive, expirationDate } = codeData
      
      // Check expiration using UTC comparison
      const expired = expirationDate ? isCodeExpired(expirationDate) : false
      
      // A code is considered expired if:
      // 1. It has an expiration date AND the date has passed (in UTC)
      // 2. OR it's marked as inactive
      const isExpired = expired || !isActive
      
      if (isExpired) {
        expiredCodes.push({
          code,
          isActive,
          expiresAt: expirationDate ? expirationDate.toISOString() : null,
          expiredAt: expirationDate ? expirationDate.toISOString() : null,
          checkedAt: now.toISOString()
        })
      } else {
        activeCodes.push({
          code,
          isActive,
          expiresAt: expirationDate ? expirationDate.toISOString() : null,
          checkedAt: now.toISOString()
        })
      }
    })
    
    // Log the check
    await logAuditEvent(event, context, 'EXPIRED_CODES_CHECK', {
      totalCodes: codes.length,
      activeCodes: activeCodes.length,
      expiredCodes: expiredCodes.length,
      checkedAt: now.toISOString(),
      timezone: 'UTC',
      details: `Checked ${codes.length} codes. Found ${activeCodes.length} active and ${expiredCodes.length} expired codes.`
    })
    
    console.log(`Expired codes check complete: ${activeCodes.length} active, ${expiredCodes.length} expired`)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        checkedAt: now.toISOString(),
        timezone: 'UTC',
        totalCodes: codes.length,
        activeCodes: activeCodes.length,
        expiredCodes: expiredCodes.length,
        expired: expiredCodes,
        active: activeCodes
      })
    }
  } catch (error) {
    console.error('Error checking expired codes:', error)
    
    await logAuditEvent(event, context, 'EXPIRED_CODES_CHECK_ERROR', {
      error: error.message,
      checkedAt: new Date().toISOString(),
      details: `Failed to check expired codes: ${error.message}`
    })
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to check expired codes',
        message: error.message
      })
    }
  }

}

// Export for both Netlify and Vercel
exports.handler = handler

// Vercel format
const { createVercelHandler } = require('./_vercel-wrapper')
module.exports = createVercelHandler(handler)}

