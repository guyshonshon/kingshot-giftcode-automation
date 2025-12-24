const fs = require('fs').promises
const path = require('path')

const STATS_FILE = path.join('/tmp', 'stats.json')

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { stats } = JSON.parse(event.body)

    if (!stats) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Stats data is required' })
      }
    }

    await fs.writeFile(STATS_FILE, JSON.stringify(stats), 'utf8')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true })
    }
  } catch (error) {
    console.error('Error saving stats:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to save stats' })
    }
  }
}

