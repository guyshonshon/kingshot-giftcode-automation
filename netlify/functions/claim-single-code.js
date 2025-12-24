const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { logSingleCodeClaim } = require('./utils/audit-log')
const { getPlayers, playerExists, updatePlayer } = require('./utils/player-storage')

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
          // More lenient success detection - code 0 or 1 might both be success
          // Also check if msg contains success keywords
          const isSuccess = res.statusCode === 200 && (
            json.code === 0 || 
            (json.code === 1 && json.msg && (json.msg.toLowerCase().includes('success') || json.msg.toLowerCase().includes('claimed'))) ||
            json.success === true || 
            json.status === 'success' ||
            (json.msg && 
             !json.msg.toLowerCase().includes('error') && 
             !json.msg.toLowerCase().includes('fail') &&
             !json.msg.toLowerCase().includes('invalid') &&
             !json.msg.toLowerCase().includes('not found') &&
             (json.msg.toLowerCase().includes('success') || 
              json.msg.toLowerCase().includes('claimed') ||
              json.msg.toLowerCase().includes('redeem')))
          )
          resolve({ 
            success: isSuccess, 
            data: json, 
            statusCode: res.statusCode 
          })
        } catch (e) {
          // If response is not JSON, check if it contains success indicators
          const isSuccess = res.statusCode === 200 && (
            data.toLowerCase().includes('success') || 
            data.toLowerCase().includes('claimed')
          )
          resolve({ 
            success: isSuccess, 
            data: { raw: data, parseError: e.message }, 
            statusCode: res.statusCode,
            error: 'Invalid JSON response'
          })
        }
      })
    })

    req.on('error', (error) => {
      console.error('Request error in redeemGiftCode:', error)
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
    const { playerId, giftCode, recaptchaToken } = JSON.parse(event.body)

    if (!playerId || !giftCode) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Player ID and gift code are required' })
      }
    }

    // No verification code required for single player claims

    // Verify player exists using Netlify Blobs
    const normalizedPlayerId = String(playerId).trim()
    const exists = await playerExists(normalizedPlayerId, context)
    
    if (!exists) {
      const allPlayers = await getPlayers(context)
      console.error(`Player ID not found. Looking for: ${normalizedPlayerId}, Available players:`, 
        (allPlayers.players || []).map(p => typeof p === 'string' ? p : p.id))
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Player ID not found',
          debug: {
            requestedId: normalizedPlayerId,
            availablePlayers: (allPlayers.players || []).map(p => typeof p === 'string' ? p : p.id)
          }
        })
      }
    }

    // Verify reCAPTCHA if configured
    if (RECAPTCHA_SECRET_KEY) {
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

    // Check if already claimed
    if (await hasClaimed(playerId, giftCode)) {
      await logSingleCodeClaim(event, context, playerId, giftCode, true, 'Already claimed')
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Code already claimed',
          alreadyClaimed: true
        })
      }
    }

    // Login first
    const loginResult = await loginPlayer(playerId)
    
    if (!loginResult.success) {
      const loginError = loginResult.data?.msg || loginResult.error || 'Unknown login error'
      console.error('Login failed for player:', playerId, 'Error:', loginError, 'Status:', loginResult.statusCode)
      await logSingleCodeClaim(event, context, playerId, giftCode, false, `Login failed: ${loginError}`)
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Login failed',
          message: loginError,
          details: loginResult.data
        })
      }
    }

    await sleep(200)

    // Redeem gift code
    const redeemResult = await redeemGiftCode(playerId, giftCode)
    
    console.log('Redemption result for', playerId, 'code', giftCode, ':', {
      success: redeemResult.success,
      statusCode: redeemResult.statusCode,
      data: redeemResult.data,
      error: redeemResult.error
    })
    
    if (redeemResult.success) {
      await markAsClaimed(playerId, giftCode)
      await addRecentCode(giftCode, playerId)
      
      // Update player metadata using Netlify Blobs
      const currentData = await getPlayers(context)
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
      }, context)
      
      // Log audit event
      await logSingleCodeClaim(event, context, playerId, giftCode, true)
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Code claimed successfully'
        })
      }
    } else {
      // Extract detailed error message
      const errorMsg = redeemResult.data?.msg || 
                      redeemResult.data?.message || 
                      redeemResult.error || 
                      `API returned status ${redeemResult.statusCode}`
      const errorCode = redeemResult.data?.code
      const fullError = errorCode !== undefined ? `[Code ${errorCode}] ${errorMsg}` : errorMsg
      
      console.error('Redemption failed for player:', playerId, 'code:', giftCode, 'Error:', fullError, 'Response:', redeemResult.data)
      
      // Log audit event
      await logSingleCodeClaim(event, context, playerId, giftCode, false, fullError)
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Redemption failed',
          message: fullError,
          details: redeemResult.data,
          statusCode: redeemResult.statusCode
        })
      }
    }
  } catch (error) {
    console.error('Error claiming single code:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to claim code',
        message: error.message 
      })
    }
  }
}

