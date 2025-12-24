const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { logPlayerRemoved } = require('./utils/audit-log')

const DATA_FILE = path.join('/tmp', 'players.json')
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

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ players: [] }), 'utf8')
  }
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

    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    const json = JSON.parse(data)
    
    if (!json.players) {
      json.players = []
    }

    // Support both old format (array of strings) and new format (array of objects)
    const playerExisted = json.players.some(p => 
      typeof p === 'string' ? p === playerId : p.id === playerId
    )

    json.players = json.players.filter(p => {
      if (typeof p === 'string') {
        return p !== playerId
      }
      return p.id !== playerId
    })
    
    await fs.writeFile(DATA_FILE, JSON.stringify(json), 'utf8')

    // Log audit event
    await logPlayerRemoved(event, context, playerId, playerExisted)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true, playerId })
    }
  } catch (error) {
    console.error('Error removing player:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to remove player' })
    }
  }
}
