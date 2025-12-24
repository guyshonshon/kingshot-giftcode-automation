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
          const activeSectionMatch = data.match(/## Active Gift Codes[\s\S]*?(?=## Expired Gift Codes|$)/i)
          if (activeSectionMatch) {
            const activeSection = activeSectionMatch[0]
            const foundCodes = new Set()
            
            const codePatterns = [
              /\b([A-Z0-9]{6,20})\b/g,
              /(?:Copy|Quick Redeem|Share)[\s\S]*?\b([A-Z0-9]{6,20})\b/gi
            ]
            
            codePatterns.forEach(pattern => {
              let match
              while ((match = pattern.exec(activeSection)) !== null) {
                const code = match[1] || match[0]
                const upperCode = code.toUpperCase().trim()
                const excludeList = ['ACTIVE', 'EXPIRED', 'EXPIRES', 'COPY', 'QUICK', 'REDEEM', 'SHARE']
                if (upperCode.length >= 6 && upperCode.length <= 20 && 
                    !excludeList.includes(upperCode) && /^[A-Z0-9]+$/.test(upperCode)) {
                  foundCodes.add(upperCode)
                }
              }
            })
            
            activeCodes.push(...Array.from(foundCodes))
          }
          
          if (activeCodes.length === 0) {
            const allCodeMatches = data.match(/\b([A-Z0-9]{8,15})\b/g)
            if (allCodeMatches) {
              const uniqueCodes = new Set()
              allCodeMatches.forEach(code => {
                const upperCode = code.toUpperCase()
                if (upperCode.length >= 6 && upperCode.length <= 20 && 
                    /^[A-Z0-9]+$/.test(upperCode)) {
                  const codeIndex = data.indexOf(upperCode)
                  const expiredIndex = data.indexOf('Expired Gift Codes', codeIndex)
                  if (expiredIndex === -1 || codeIndex < expiredIndex) {
                    uniqueCodes.add(upperCode)
                  }
                }
              })
              activeCodes.push(...Array.from(uniqueCodes))
            }
          }
          
          resolve([...new Set(activeCodes)])
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
    // Get active codes
    const activeCodes = await scrapeGiftCodes()
    
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
    
    // Build codes with claim info
    const codesWithClaims = activeCodes.map(code => {
      const playersWhoClaimed = []
      Object.keys(claims).forEach(playerId => {
        if (claims[playerId] && claims[playerId].includes(code)) {
          playersWhoClaimed.push(playerId)
        }
      })
      
      // Find in recent codes for timestamp
      const recentCodeInfo = recentCodesData.find(rc => rc.code === code)
      
      return {
        code,
        claimCount: playersWhoClaimed.length,
        players: playersWhoClaimed,
        timestamp: recentCodeInfo?.timestamp || null
      }
    })
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        codes: codesWithClaims
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

