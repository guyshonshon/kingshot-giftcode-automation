const https = require('https')
const { logPlayerAdded } = require('./utils/audit-log')
const { getPlayers, addPlayer } = require('./utils/player-storage')

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY

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

// Removed ensureDataFile - using Netlify Blobs now

// Verify player ID by checking Kingshot API
async function verifyPlayer(playerId) {
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
          const isValid = res.statusCode === 200 && json
          resolve({ 
            success: isValid, 
            data: json, 
            statusCode: res.statusCode,
            message: json.msg || json.message || (isValid ? 'Player verified' : 'Player not found')
          })
        } catch (e) {
          resolve({ 
            success: false, 
            error: 'Invalid response', 
            statusCode: res.statusCode,
            message: 'Failed to verify player'
          })
        }
      })
    })

    req.on('error', (error) => {
      reject({ success: false, error: error.message, message: 'Network error during verification' })
    })

    req.setTimeout(10000, () => {
      req.destroy()
      reject({ success: false, error: 'Request timeout', message: 'Verification timeout' })
    })

    req.write(postData)
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
    const { playerId, recaptchaToken } = JSON.parse(event.body)

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
        await logPlayerAdded(event, context, playerId || 'unknown', false)
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

    if (!playerId || !/^\d{8,10}$/.test(playerId)) {
      await logPlayerAdded(event, context, playerId || 'invalid', false)
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid player ID. Must be 8-10 digits.' })
      }
    }

    // Verify player with Kingshot API
    let verificationResult
    try {
      verificationResult = await verifyPlayer(playerId)
    } catch (error) {
      verificationResult = error
    }

    if (!verificationResult.success) {
      await logPlayerAdded(event, context, playerId, false)
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Player verification failed',
          message: verificationResult.message || 'Player ID not found on Kingshot',
          verified: false
        })
      }
    }

    // Add player with metadata and verification info using Netlify Blobs
    const playerData = {
      id: playerId,
      addedAt: new Date().toISOString(),
      lastClaimed: null,
      totalClaims: 0,
      verified: true,
      verificationData: verificationResult.data || null
    }
    
    const result = await addPlayer(playerData, context)
    
    if (!result.success) {
      if (result.error === 'Player already exists') {
        await logPlayerAdded(event, context, playerId, false)
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Player ID already exists' })
        }
      }
      throw new Error(result.error || 'Failed to save player')
    }

    // Log audit event
    await logPlayerAdded(event, context, playerId, true)

    // Auto-claim will be triggered from frontend after successful addition

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true, 
        playerId,
        verified: true,
        verificationData: verificationResult.data || null,
        message: verificationResult.message || 'Player verified successfully'
      })
    }
  } catch (error) {
    console.error('Error adding player:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to add player' })
    }
  }
}
