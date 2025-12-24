const https = require('https')
const http = require('http')
const { logCodeRedemption } = require('./utils/audit-log')

// Rate limiting: track requests per gift code
// Note: In serverless, this is per-instance, but provides basic protection
const rateLimitMap = new Map()
const MAX_REQUESTS_PER_CODE = 100 // Max players per gift code
const MIN_DELAY_MS = 500 // Minimum delay between requests (anti-spam)
const RATE_LIMIT_WINDOW_MS = 3600000 // 1 hour window
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const VERIFICATION_CODE = process.env.VERIFICATION_CODE || '0228' // Default for development

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification')
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
    // Try different possible API formats
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
          // Check for success indicators (code: 0, success: true, or status: success)
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
          // If response is not JSON, check status code
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
    const { giftCode, verificationCode, recaptchaToken, players } = JSON.parse(event.body)

    // reCAPTCHA is optional - only verify if secret key is configured
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

    if (!verificationCode || !/^\d{4}$/.test(verificationCode)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Valid 4-digit verification code is required' })
      }
    }

    if (verificationCode !== VERIFICATION_CODE) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid verification code' })
      }
    }

    if (!giftCode || !giftCode.trim()) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Gift code is required' })
      }
    }

    if (!players || !Array.isArray(players) || players.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'At least one player ID is required' })
      }
    }

    // Rate limiting check with timestamp tracking
    const codeKey = giftCode.trim()
    const now = Date.now()
    const limitEntry = rateLimitMap.get(codeKey) || { count: 0, timestamp: now }
    
    // Reset if window expired
    if (now - limitEntry.timestamp > RATE_LIMIT_WINDOW_MS) {
      limitEntry.count = 0
      limitEntry.timestamp = now
    }
    
    if (limitEntry.count >= MAX_REQUESTS_PER_CODE) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_CODE} redemptions per gift code per hour.` 
        })
      }
    }

    if (players.length > MAX_REQUESTS_PER_CODE) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: `Too many players. Maximum ${MAX_REQUESTS_PER_CODE} players per redemption.` 
        })
      }
    }

    limitEntry.count += players.length
    rateLimitMap.set(codeKey, limitEntry)

    let successCount = 0
    let failCount = 0
    const results = []

    // Process each player with delay to avoid spamming
    for (let i = 0; i < players.length; i++) {
      const playerId = players[i]
      
      try {
        // Login first
        const loginResult = await loginPlayer(playerId)
        
        if (!loginResult.success) {
          failCount++
          results.push({ playerId, success: false, error: 'Login failed' })
          await sleep(MIN_DELAY_MS)
          continue
        }

        // Small delay between login and redeem
        await sleep(200)

        // Redeem gift code
        const redeemResult = await redeemGiftCode(playerId, codeKey)
        
        if (redeemResult.success) {
          successCount++
          results.push({ playerId, success: true })
        } else {
          failCount++
          results.push({ 
            playerId, 
            success: false, 
            error: redeemResult.data?.msg || 'Redemption failed' 
          })
        }
      } catch (error) {
        failCount++
        results.push({ playerId, success: false, error: error.message })
      }

      // Anti-spam delay between requests
      if (i < players.length - 1) {
        await sleep(MIN_DELAY_MS)
      }
    }

    // Log audit event
    await logCodeRedemption(event, context, codeKey, players, results)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        giftCode: codeKey,
        successCount,
        failCount,
        totalPlayers: players.length,
        results
      })
    }
  } catch (error) {
    console.error('Error redeeming gift code:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to redeem gift code: ' + error.message })
    }
  }
}

