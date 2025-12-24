const fs = require('fs').promises
const path = require('path')
const https = require('https')

const CLAIMS_FILE = path.join('/tmp', 'claims.json')
const RECENT_CODES_FILE = path.join('/tmp', 'recent-codes.json')

async function ensureClaimsFile() {
  try {
    await fs.access(CLAIMS_FILE)
  } catch {
    await fs.writeFile(CLAIMS_FILE, JSON.stringify({}), 'utf8')
  }
}

async function ensureRecentCodesFile() {
  try {
    await fs.access(RECENT_CODES_FILE)
  } catch {
    await fs.writeFile(RECENT_CODES_FILE, JSON.stringify([]), 'utf8')
  }
}

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
          const activeCodes = []
          const expiredCodes = []
          const foundCodes = new Set()
          
          // The site is a Next.js app with JSON embedded in the HTML
          // The JSON can be escaped (\"code\":\"THEKINGSTORE\") or unescaped ("code":"THEKINGSTORE")
          // Look for patterns like: "code":"THEKINGSTORE"...\"isActive\":true...\"expiresAt\":\"$D2026-01-05T00:00:00.000Z\" or null
          // Use a regex to extract each code object (handling both escaped and unescaped quotes)
          // Pattern matches: "code":"CODE" or \"code\":\"CODE\"...\"isActive\":true/false...\"expiresAt\":\"DATE\" or \"expiresAt\":null
          // Try escaped version first, then unescaped
          const codePatternEscaped = /\\"code\\":\\"([A-Z0-9]{4,20})\\"([\s\S]{0,2000}?)\\"isActive\\":(true|false)([\s\S]{0,2000}?)\\"expiresAt\\":(null|\\"([^"]*)\\")/g
          const codePatternUnescaped = /"code":"([A-Z0-9]{4,20})"([\s\S]{0,2000}?)"isActive":(true|false)([\s\S]{0,2000}?)"expiresAt":(null|"([^"]*)")/g
          let match
          
          // First try escaped pattern
          while ((match = codePatternEscaped.exec(data)) !== null) {
            const code = match[1]
            if (foundCodes.has(code)) continue // Skip duplicates
            foundCodes.add(code)
            
            const isActive = match[3] === 'true'
            // match[5] is either "null" or the quoted date string
            // match[6] is the date string inside quotes (if it's a quoted string, undefined if null)
            let expiresAt = match[5] === 'null' ? null : match[6]
            
            // Handle Next.js date format: $D2026-01-05T00:00:00.000Z
            if (expiresAt && typeof expiresAt === 'string' && expiresAt.startsWith('$D')) {
              expiresAt = expiresAt.substring(2) // Remove $D prefix
            }
            
            let expiration = null
            let isExpired = false
            
            if (expiresAt && expiresAt !== 'null') {
              try {
                const expDate = new Date(expiresAt)
                if (!isNaN(expDate.getTime())) {
                  // Format as MM/DD/YYYY
                  const month = expDate.getMonth() + 1
                  const day = expDate.getDate()
                  const year = expDate.getFullYear()
                  expiration = `${month}/${day}/${year}`
                  
                  // Check if expired - dates from kingshot.net are in UTC
                  // Compare UTC timestamps directly for accuracy
                  const now = new Date()
                  const nowUTC = Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                    now.getUTCHours(),
                    now.getUTCMinutes(),
                    now.getUTCSeconds()
                  )
                  isExpired = expDate.getTime() < nowUTC
                }
              } catch (e) {
                console.error(`Error parsing date for code ${code}:`, e)
              }
            }
            
            // Determine if code is active based on isActive flag and expiration
            if (isActive && !isExpired) {
              activeCodes.push({ code, expiration, isExpired: false })
            } else {
              expiredCodes.push({ code, expiration, isExpired: true })
            }
          }
          
          // Then try unescaped pattern for codes we haven't found yet
          while ((match = codePatternUnescaped.exec(data)) !== null) {
            const code = match[1]
            if (foundCodes.has(code)) continue // Skip duplicates
            foundCodes.add(code)
            
            const isActive = match[3] === 'true'
            let expiresAt = match[5] === 'null' ? null : match[6]
            
            // Handle Next.js date format: $D2026-01-05T00:00:00.000Z
            if (expiresAt && typeof expiresAt === 'string' && expiresAt.startsWith('$D')) {
              expiresAt = expiresAt.substring(2) // Remove $D prefix
            }
            
            let expiration = null
            let isExpired = false
            
            if (expiresAt && expiresAt !== 'null') {
              try {
                const expDate = new Date(expiresAt)
                if (!isNaN(expDate.getTime())) {
                  // Format as MM/DD/YYYY
                  const month = expDate.getMonth() + 1
                  const day = expDate.getDate()
                  const year = expDate.getFullYear()
                  expiration = `${month}/${day}/${year}`
                  
                  // Check if expired - dates from kingshot.net are in UTC
                  // Compare UTC timestamps directly for accuracy
                  const now = new Date()
                  const nowUTC = Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                    now.getUTCHours(),
                    now.getUTCMinutes(),
                    now.getUTCSeconds()
                  )
                  isExpired = expDate.getTime() < nowUTC
                }
              } catch (e) {
                console.error(`Error parsing date for code ${code}:`, e)
              }
            }
            
            // Determine if code is active based on isActive flag and expiration
            if (isActive && !isExpired) {
              activeCodes.push({ code, expiration, isExpired: false })
            } else {
              expiredCodes.push({ code, expiration, isExpired: true })
            }
          }
          
          console.log(`Scraped ${activeCodes.length} active codes and ${expiredCodes.length} expired codes`)
          
          // Return both active and expired codes
          resolve({ active: activeCodes, expired: expiredCodes })
        } catch (error) {
          console.error('Error in scrapeGiftCodes:', error)
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

// Netlify handler
const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get active and expired codes
    const { active: activeCodes, expired: expiredCodes } = await scrapeGiftCodes()
    
    // Get claims data
    await ensureClaimsFile()
    const claimsData = await fs.readFile(CLAIMS_FILE, 'utf8')
    const claims = JSON.parse(claimsData)
    
    // Get recent codes for additional info
    await ensureRecentCodesFile()
    let recentCodesData = []
    try {
      const recentData = await fs.readFile(RECENT_CODES_FILE, 'utf8')
      recentCodesData = JSON.parse(recentData)
    } catch {
      // File might not exist yet
    }
    
    // Helper function to build code with claim info
    const buildCodeWithClaims = (codeObj) => {
      const code = codeObj.code
      const expiration = codeObj.expiration
      const isExpired = codeObj.isExpired || false
      
      const playersWhoClaimed = []
      Object.keys(claims).forEach(playerId => {
        if (claims[playerId] && claims[playerId].includes(code)) {
          playersWhoClaimed.push(playerId)
        }
      })
      
      // Find in recent codes for timestamp
      const recentCodeInfo = recentCodesData.find(rc => rc.code === code)
      
      // Parse expiration date for sorting
      let expirationDate = null
      if (expiration) {
        try {
          // Parse MM/DD/YYYY format
          const parts = expiration.split('/')
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10) - 1
            const day = parseInt(parts[1], 10)
            const year = parseInt(parts[2], 10)
            const parsed = new Date(year, month, day)
            if (!isNaN(parsed.getTime())) {
              expirationDate = parsed.toISOString()
            }
          }
        } catch (e) {
          // Keep expiration as string if parsing fails
        }
      }
      
      return {
        code,
        expiration,
        expirationDate,
        isExpired,
        claimCount: playersWhoClaimed.length,
        players: playersWhoClaimed,
        timestamp: recentCodeInfo?.timestamp || null
      }
    }
    
    // Build active codes with claim info
    const activeCodesWithClaims = activeCodes.map(buildCodeWithClaims)
    
    // Sort active codes by expiration date (earliest first, then codes without expiration at the end)
    activeCodesWithClaims.sort((a, b) => {
      if (!a.expirationDate && !b.expirationDate) return 0
      if (!a.expirationDate) return 1 // No expiration goes to end
      if (!b.expirationDate) return -1
      return new Date(a.expirationDate) - new Date(b.expirationDate)
    })
    
    // Build expired codes with claim info
    const expiredCodesWithClaims = expiredCodes.map(buildCodeWithClaims)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        activeCodes: activeCodesWithClaims,
        expiredCodes: expiredCodesWithClaims
      })
    }
  } catch (error) {
    console.error('Error getting codes with claims:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to get codes',
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

