const fs = require('fs').promises
const path = require('path')

const DATA_FILE = path.join('/tmp', 'players.json')
const CLAIMS_FILE = path.join('/tmp', 'claims.json')

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
    const playersParam = event.queryStringParameters?.players
    if (!playersParam) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Players parameter is required' })
      }
    }

    const playerIds = playersParam.split(',').filter(id => id.trim())
    
    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    const json = JSON.parse(data)
    const playersData = json.players || []
    
    await ensureClaimsFile()
    const claimsData = await fs.readFile(CLAIMS_FILE, 'utf8')
    const claims = JSON.parse(claimsData)
    
    const stats = {}
    
    playerIds.forEach(playerId => {
      // Get player data (support both old and new format)
      const playerData = playersData.find(p => 
        typeof p === 'string' ? p === playerId : p.id === playerId
      )
      
      // Count claims for this player
      const playerClaims = claims[playerId] || []
      const totalClaims = playerClaims.length
      
      stats[playerId] = {
        totalClaims,
        lastClaimed: typeof playerData === 'object' ? playerData.lastClaimed : null,
        addedAt: typeof playerData === 'object' ? playerData.addedAt : null
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
        stats
      })
    }
  } catch (error) {
    console.error('Error getting player stats:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to get player stats',
        message: error.message 
      })
    }
  }
}

