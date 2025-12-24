const { getPlayers } = require('./utils/player-storage')

// Netlify handler
const handler = async (event, context) => {
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
    const data = await getPlayers(context)
    
    // Support both old format (array of strings) and new format (array of objects)
    const players = (data.players || []).map(p => 
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
        playersData: data.players || [] // Also return full data for future use
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

// Export for both Netlify and Vercel
exports.handler = handler

// Vercel format
const { createVercelHandler } = require('./_vercel-wrapper')
module.exports = createVercelHandler(handler)

