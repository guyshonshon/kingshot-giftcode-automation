const fs = require('fs').promises
const path = require('path')

const DATA_FILE = path.join('/tmp', 'players.json')

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ players: [] }), 'utf8')
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    const json = JSON.parse(data)
    
    // Support both old format (array of strings) and new format (array of objects)
    const players = (json.players || []).map(p => 
      typeof p === 'string' ? p : p.id
    )
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        players,
        playersData: json.players || [] // Also return full data for future use
      })
    }
  } catch (error) {
    console.error('Error reading players:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to load players', players: [] })
    }
  }
}

