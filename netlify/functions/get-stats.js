const fs = require('fs').promises
const path = require('path')

const STATS_FILE = path.join('/tmp', 'stats.json')

async function ensureStatsFile() {
  try {
    await fs.access(STATS_FILE)
  } catch {
    await fs.writeFile(STATS_FILE, JSON.stringify({
      totalGifts: 0,
      successfulRedeems: 0,
      failedRedeems: 0
    }), 'utf8')
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
    await ensureStatsFile()
    const data = await fs.readFile(STATS_FILE, 'utf8')
    const stats = JSON.parse(data)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ stats })
    }
  } catch (error) {
    console.error('Error reading stats:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to load stats',
        stats: {
          totalGifts: 0,
          successfulRedeems: 0,
          failedRedeems: 0
        }
      })
    }
  }
}

