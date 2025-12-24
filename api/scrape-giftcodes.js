const https = require('https')

async function scrapeGiftCodes() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kingshot.net',
      path: '/gift-codes',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const activeCodes = []
          
          // Find the "Active Gift Codes" section
          const activeSectionMatch = data.match(/## Active Gift Codes[\s\S]*?(?=## Expired Gift Codes|$)/i)
          if (activeSectionMatch) {
            const activeSection = activeSectionMatch[0]
            
            // Look for code patterns - typically uppercase alphanumeric codes
            // Based on the actual site structure, codes appear as text content
            const codePatterns = [
              // Match standalone uppercase alphanumeric codes (6-20 chars)
              /\b([A-Z0-9]{6,20})\b/g,
              // Match codes in button or link contexts
              /(?:Copy|Quick Redeem|Share)[\s\S]*?\b([A-Z0-9]{6,20})\b/gi
            ]
            
            const foundCodes = new Set()
            
            codePatterns.forEach(pattern => {
              let match
              while ((match = pattern.exec(activeSection)) !== null) {
                const code = match[1] || match[0]
                const upperCode = code.toUpperCase().trim()
                
                // Filter out false positives
                const excludeList = [
                  'ACTIVE', 'EXPIRED', 'EXPIRES', 'COPY', 'QUICK', 'REDEEM', 'SHARE',
                  'GIFT', 'CODE', 'CODES', 'TOTAL', 'AT', 'NOT', 'SPECIFIED', 'YET',
                  'THEKINGSTORE', 'KINGSHOT13M', 'STORELAUNCH', 'JACKKAOANDKS', 'VIP777'
                ]
                
                if (upperCode.length >= 6 && 
                    upperCode.length <= 20 && 
                    !excludeList.includes(upperCode) &&
                    /^[A-Z0-9]+$/.test(upperCode)) {
                  foundCodes.add(upperCode)
                }
              }
            })
            
            // Also try to find codes by looking for the specific structure
            // Codes are typically listed with "Active" badge before them
            const activeBadgeMatches = activeSection.match(/Active[\s\S]{0,200}?([A-Z0-9]{6,20})/gi)
            if (activeBadgeMatches) {
              activeBadgeMatches.forEach(match => {
                const codeMatch = match.match(/\b([A-Z0-9]{6,20})\b/)
                if (codeMatch) {
                  const code = codeMatch[1].toUpperCase()
                  if (code.length >= 6 && code.length <= 20 && /^[A-Z0-9]+$/.test(code)) {
                    foundCodes.add(code)
                  }
                }
              })
            }
            
            activeCodes.push(...Array.from(foundCodes))
          }
          
          // Fallback: if no codes found, try broader search
          if (activeCodes.length === 0) {
            const allCodeMatches = data.match(/\b([A-Z0-9]{8,15})\b/g)
            if (allCodeMatches) {
              const uniqueCodes = new Set()
              allCodeMatches.forEach(code => {
                const upperCode = code.toUpperCase()
                if (upperCode.length >= 6 && upperCode.length <= 20 && 
                    /^[A-Z0-9]+$/.test(upperCode) &&
                    !['ACTIVE', 'EXPIRED', 'EXPIRES'].includes(upperCode)) {
                  // Check if it appears before "Expired Gift Codes"
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

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

// Netlify handler
const handler = async (event, context) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
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
    const codes = await scrapeGiftCodes()
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        codes,
        count: codes.length,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error scraping gift codes:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to scrape gift codes',
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

