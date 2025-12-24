const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { logSingleCodeClaim } = require('./utils/audit-log')

const DATA_FILE = path.join('/tmp', 'players.json')
const CLAIMS_FILE = path.join('/tmp', 'claims.json')
const RECENT_CODES_FILE = path.join('/tmp', 'recent-codes.json')
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const VERIFICATION_CODE = process.env.VERIFICATION_CODE || '0228'

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

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ players: [] }), 'utf8')
  }
}

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

    // Verify player exists
    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    const json = JSON.parse(data)
    const playersData = json.players || []
    
    const playerExists = playersData.some(p => 
      typeof p === 'string' ? p === playerId : p.id === playerId
    )
    
    if (!playerExists) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Player ID not found' })
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
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Login failed' })
      }
    }

    await sleep(200)

    // Redeem gift code
    const redeemResult = await redeemGiftCode(playerId, giftCode)
    
    if (redeemResult.success) {
      await markAsClaimed(playerId, giftCode)
      await addRecentCode(giftCode, playerId)
      
      // Update player metadata
      const playerIndex = playersData.findIndex(p => 
        typeof p === 'string' ? p === playerId : p.id === playerId
      )
      if (playerIndex >= 0) {
        if (typeof playersData[playerIndex] === 'string') {
          playersData[playerIndex] = {
            id: playerId,
            addedAt: new Date().toISOString(),
            lastClaimed: new Date().toISOString(),
            totalClaims: 1
          }
        } else {
          playersData[playerIndex].lastClaimed = new Date().toISOString()
          playersData[playerIndex].totalClaims = (playersData[playerIndex].totalClaims || 0) + 1
        }
        json.players = playersData
        await fs.writeFile(DATA_FILE, JSON.stringify(json), 'utf8')
      }
      
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
      const errorMsg = redeemResult.data?.msg || 'Unknown error'
      // Log audit event
      await logSingleCodeClaim(event, context, playerId, giftCode, false, errorMsg)
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Redemption failed',
          message: errorMsg
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

