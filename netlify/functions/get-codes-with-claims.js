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
          
          // Extract Active Gift Codes section
          const activeSectionMatch = data.match(/## Active Gift Codes([\s\S]*?)(?:## Expired Gift Codes|$)/i)
          if (activeSectionMatch) {
            const activeSection = activeSectionMatch[1]
            const foundActive = new Set()
            
            // Split by "Active" markers to get individual code blocks
            const activeBlocks = activeSection.split(/Active\s+/i).filter(block => block.trim().length > 0)
            
            activeBlocks.forEach(block => {
              // Extract code - look for standalone code on a line
              const lines = block.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
              
              let code = null
              let expiration = null
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                
                // Check if this line is a code (4-20 alphanumeric chars, standalone)
                const codeMatch = line.match(/^([A-Z0-9]{4,20})$/i)
                if (codeMatch && !code) {
                  const potentialCode = codeMatch[1].toUpperCase().trim()
                  const excludeList = ['ACTIVE', 'EXPIRED', 'EXPIRES', 'COPY', 'QUICK', 'REDEEM', 'SHARE', 'GIFT', 'CODES']
                  if (!excludeList.includes(potentialCode) && /^[A-Z0-9]+$/.test(potentialCode)) {
                    code = potentialCode
                  }
                }
                
                // Check for expiration date
                const expirationMatch = line.match(/Expires:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
                if (expirationMatch) {
                  expiration = expirationMatch[1].trim()
                }
                
                // If we found both code and expiration, or code and we're at the end, break
                if (code && (expiration || i === lines.length - 1)) {
                  break
                }
              }
              
              if (code && !foundActive.has(code)) {
                foundActive.add(code)
                activeCodes.push({ code, expiration, isExpired: false })
              }
            })
          }
          
          // Extract Expired Gift Codes section
          const expiredSectionMatch = data.match(/## Expired Gift Codes([\s\S]*?)(?:##|$)/i)
          if (expiredSectionMatch) {
            const expiredSection = expiredSectionMatch[1]
            const foundExpired = new Set()
            
            // Split by "Expired" markers to get individual code blocks
            const expiredBlocks = expiredSection.split(/Expired\s+/i).filter(block => block.trim().length > 0)
            
            expiredBlocks.forEach(block => {
              // Skip if this block contains "Expired At" in the first part (it's part of previous block)
              if (/Expired At:/i.test(block.split(/\n/)[0])) {
                return
              }
              
              // Extract code - look for standalone code on a line
              const lines = block.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
              
              let code = null
              let expiration = null
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                
                // Check if this line is a code (4-20 alphanumeric chars, standalone)
                const codeMatch = line.match(/^([A-Z0-9]{4,20})$/i)
                if (codeMatch && !code) {
                  const potentialCode = codeMatch[1].toUpperCase().trim()
                  const excludeList = ['EXPIRED', 'EXPIRES', 'GIFT', 'CODES', 'SPECIFIED', 'YET', 'EXPIRATION', 'AT']
                  if (!excludeList.includes(potentialCode) && /^[A-Z0-9]+$/.test(potentialCode)) {
                    code = potentialCode
                  }
                }
                
                // Check for expiration date
                const expiredAtMatch = line.match(/Expired At:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
                if (expiredAtMatch) {
                  expiration = expiredAtMatch[1].trim()
                }
                
                // If we found both code and expiration, or code and we're at the end, break
                if (code && (expiration || i === lines.length - 1)) {
                  break
                }
              }
              
              if (code && !foundExpired.has(code) && !activeCodes.find(ac => ac.code === code)) {
                foundExpired.add(code)
                expiredCodes.push({ code, expiration, isExpired: true })
              }
            })
          }
          
          // Return both active and expired codes
          resolve({ active: activeCodes, expired: expiredCodes })
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

exports.handler = async (event, context) => {
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

