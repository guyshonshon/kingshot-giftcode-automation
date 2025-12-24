const { getAuditLogs } = require('./utils/simple-audit')

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
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10)
    const logs = await getAuditLogs(null, limit)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        logs,
        count: logs.length
      })
    }
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to get audit logs',
        message: error.message 
      })
    }
  }
}

