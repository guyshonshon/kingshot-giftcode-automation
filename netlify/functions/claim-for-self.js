const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { logAutoClaim } = require('./utils/simple-audit')
const { playerExists, getPlayers, updatePlayer } = require('./utils/simple-storage')

const DATA_FILE = path.join('/tmp', 'players.json')
const CLAIMS_FILE = path.join('/tmp', 'claims.json')
const RECENT_CODES_FILE = path.join('/tmp', 'recent-codes.json')
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const VERIFICATION_CODE = process.env.VERIFICATION_CODE || '670069'

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    return true
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      secret: RECAPTCHA_SECRET_KEY,
      response: token
    })

    const options = {
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.success === true)
        } catch {
          resolve(false)
        }
      })
    })

    req.on('error', () => resolve(false))
    req.write(postData)
    req.end()
  })
}

// Removed ensureDataFile - using Netlify Blobs now

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

async function getClaims() {
  await ensureClaimsFile()
  const data = await fs.readFile(CLAIMS_FILE, 'utf8')
  return JSON.parse(data)
}

async function saveClaims(claims) {
  await fs.writeFile(CLAIMS_FILE, JSON.stringify(claims), 'utf8')
}

async function hasClaimed(playerId, giftCode) {
  const claims = await getClaims()
  return claims[playerId] && claims[playerId].includes(giftCode)
}

async function markAsClaimed(playerId, giftCode) {
  const claims = await getClaims()
  if (!claims[playerId]) {
    claims[playerId] = []
  }
  if (!claims[playerId].includes(giftCode)) {
    claims[playerId].push(giftCode)
    await saveClaims(claims)
  }
}

async function addRecentCode(giftCode, playerId) {
  await ensureRecentCodesFile()
  const data = await fs.readFile(RECENT_CODES_FILE, 'utf8')
  const recentCodes = JSON.parse(data)
  
  const existingIndex = recentCodes.findIndex(c => c.code === giftCode)
  const now = new Date().toISOString()
  
  if (existingIndex >= 0) {
    const existing = recentCodes[existingIndex]
    if (!existing.players.includes(playerId)) {
      existing.players.push(playerId)
      existing.claimCount = existing.players.length
      existing.timestamp = now
    }
  } else {
    recentCodes.unshift({
      code: giftCode,
      players: [playerId],
      claimCount: 1,
      timestamp: now
    })
  }
  
  // Keep only last 50 codes
  const trimmed = recentCodes.slice(0, 50)
  await fs.writeFile(RECENT_CODES_FILE, JSON.stringify(trimmed), 'utf8')
}

async function loginPlayer(playerId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ player_id: playerId })
    
    const options = {
      hostname: 'kingshot-giftcode.centurygame.com',
      path: '/api/player',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://ks-giftcode.centurygame.com',
        'Referer': 'https://ks-giftcode.centurygame.com/'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ success: res.statusCode === 200, data: json, statusCode: res.statusCode })
        } catch (e) {
          resolve({ success: false, error: 'Invalid response', statusCode: res.statusCode })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

async function redeemGiftCode(playerId, giftCode) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ 
      player_id: playerId,
      gift_code: giftCode
    })
    
    const options = {
      hostname: 'kingshot-giftcode.centurygame.com',
      path: '/api/gift_code',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://ks-giftcode.centurygame.com',
        'Referer': 'https://ks-giftcode.centurygame.com/',
        'Accept': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const isSuccess = res.statusCode === 200 && (
            json.code === 0 || 
            json.success === true || 
            json.status === 'success' ||
            (json.msg && !json.msg.toLowerCase().includes('error') && !json.msg.toLowerCase().includes('fail'))
          )
          resolve({ 
            success: isSuccess, 
            data: json, 
            statusCode: res.statusCode 
          })
        } catch (e) {
          resolve({ 
            success: res.statusCode === 200 && data.includes('success'), 
            data: { raw: data }, 
            statusCode: res.statusCode,
            error: 'Invalid JSON response'
          })
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

    req.write(postData)
    req.end()
  })
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  if (event.httpMethod !== 'POST') {
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
    const { playerId, recaptchaToken, skipRecaptcha } = JSON.parse(event.body)

    if (!playerId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Player ID is required' })
      }
    }

    // Verify player exists
    const normalizedPlayerId = String(playerId).trim()
    const exists = await playerExists(normalizedPlayerId)
    
    if (!exists) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Player ID not found' })
      }
    }

    // Verify reCAPTCHA if configured (skip if auto-claim)
    if (RECAPTCHA_SECRET_KEY && !skipRecaptcha) {
      if (!recaptchaToken) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'reCAPTCHA verification required' })
        }
      }

      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken)
      if (!isValidRecaptcha) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
        }
      }
    }

    // Scrape active codes
    const activeCodes = await scrapeGiftCodes()
    
    if (activeCodes.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'No active codes found',
          codesClaimed: []
        })
      }
    }

    const codesClaimed = []
    const results = []

    // Process each code
    for (const giftCode of activeCodes) {
      // Check if already claimed (idempotent)
      if (await hasClaimed(playerId, giftCode)) {
        continue
      }

      try {
        // Login first
        const loginResult = await loginPlayer(playerId)
        
        if (!loginResult.success) {
          results.push({ giftCode, success: false, error: 'Login failed' })
          await sleep(500)
          continue
        }

        await sleep(200)

        // Redeem gift code
        const redeemResult = await redeemGiftCode(playerId, giftCode)
        
        if (redeemResult.success) {
          await markAsClaimed(playerId, giftCode)
          await addRecentCode(giftCode, playerId)
          
          // Update player metadata
          const currentData = await getPlayers()
          const currentPlayer = currentData.players.find(p => {
            const pId = typeof p === 'string' ? p : p.id
            return String(pId).trim() === normalizedPlayerId
          })
          
          const currentTotalClaims = (currentPlayer && typeof currentPlayer === 'object') 
            ? (currentPlayer.totalClaims || 0) 
            : 0
          
          await updatePlayer(normalizedPlayerId, {
            lastClaimed: new Date().toISOString(),
            totalClaims: currentTotalClaims + 1
          })
          
          codesClaimed.push(giftCode)
          results.push({ giftCode, success: true })
        } else {
          results.push({ 
            giftCode, 
            success: false, 
            error: redeemResult.data?.msg || 'Redemption failed' 
          })
        }
      } catch (error) {
        results.push({ giftCode, success: false, error: error.message })
      }

      await sleep(500)
    }

    // Log audit event
    await logAutoClaim(event, context, codesClaimed, activeCodes.length, results)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        codesClaimed,
        totalCodes: activeCodes.length,
        results,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error in claim-for-self:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to claim codes',
        message: error.message 
      })
    }
  }
}

