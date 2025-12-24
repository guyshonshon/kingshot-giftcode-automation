const fs = require('fs').promises
const path = require('path')

const RECENT_CODES_FILE = path.join('/tmp', 'recent-codes.json')

async function ensureRecentCodesFile() {
  try {
    await fs.access(RECENT_CODES_FILE)
  } catch {
    await fs.writeFile(RECENT_CODES_FILE, JSON.stringify([]), 'utf8')
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
    await ensureRecentCodesFile()
    const data = await fs.readFile(RECENT_CODES_FILE, 'utf8')
    const codes = JSON.parse(data)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        codes: codes.slice(0, 20) // Return last 20 codes
      })
    }
  } catch (error) {
    console.error('Error getting recent codes:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to get recent codes',
        message: error.message 
      })
    }
  }
}

