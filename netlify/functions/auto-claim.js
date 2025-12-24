const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { logAutoClaim } = require('./utils/audit-log')

const DATA_FILE = path.join('/tmp', 'players.json')
const CLAIMS_FILE = path.join('/tmp', 'claims.json')
const VERIFICATION_CODE = process.env.VERIFICATION_CODE || '670069'

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
  // This can be called via scheduled function or manually
  if (event.httpMethod && event.httpMethod !== 'POST') {
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
    const { force = false } = event.body ? JSON.parse(event.body) : {}
    
    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    const json = JSON.parse(data)
    const playersData = json.players || []
    
    // Support both old format (array of strings) and new format (array of objects)
    const players = playersData.map(p => typeof p === 'string' ? p : p.id)

    if (players.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'No players to claim for',
          codesClaimed: [],
          results: []
        })
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
          codesClaimed: [],
          results: []
        })
      }
    }

    const results = []
    const codesClaimed = []

    // Process each code
    for (const giftCode of activeCodes) {
      let codeSuccessCount = 0
      let codeFailCount = 0

      // Process each player
      for (const playerId of players) {
        // Check if already claimed (unless forced)
        if (!force && await hasClaimed(playerId, giftCode)) {
          continue
        }

        try {
          // Login first
          const loginResult = await loginPlayer(playerId)
          
          if (!loginResult.success) {
            codeFailCount++
            results.push({ playerId, giftCode, success: false, error: 'Login failed' })
            await sleep(500)
            continue
          }

          await sleep(200)

          // Redeem gift code
          const redeemResult = await redeemGiftCode(playerId, giftCode)
          
          if (redeemResult.success) {
            codeSuccessCount++
            await markAsClaimed(playerId, giftCode)
            
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
            
            results.push({ playerId, giftCode, success: true })
          } else {
            codeFailCount++
            results.push({ 
              playerId, 
              giftCode, 
              success: false, 
              error: redeemResult.data?.msg || 'Redemption failed' 
            })
          }
        } catch (error) {
          codeFailCount++
          results.push({ playerId, giftCode, success: false, error: error.message })
        }

        await sleep(500)
      }

      if (codeSuccessCount > 0) {
        codesClaimed.push(giftCode)
      }
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
    console.error('Error in auto-claim:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to auto-claim codes',
        message: error.message 
      })
    }
  }
}

