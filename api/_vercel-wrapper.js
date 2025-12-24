// Vercel wrapper to convert Netlify function format to Vercel format
// This allows Netlify-style functions to work on Vercel

function createVercelHandler(netlifyHandler) {
  return async (req, res) => {
    // Convert Vercel req/res to Netlify event/context format
    const event = {
      httpMethod: req.method,
      path: req.url,
      pathParameters: {},
      queryStringParameters: req.query || {},
      headers: req.headers,
      body: req.method === 'POST' || req.method === 'PUT' 
        ? JSON.stringify(req.body || {}) 
        : null,
      isBase64Encoded: false
    }

    const context = {
      // Vercel doesn't provide all Netlify context, but we can mock what we need
      functionName: req.url.split('/').pop() || 'unknown',
      functionVersion: '$LATEST',
      invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:${event.path}`,
      memoryLimitInMB: '128',
      awsRequestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    try {
      // Call the Netlify handler
      const result = await netlifyHandler(event, context)

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      // Handle OPTIONS request
      if (req.method === 'OPTIONS') {
        return res.status(200).end()
      }

      // Set status and headers from Netlify response
      res.status(result.statusCode || 200)
      
      if (result.headers) {
        Object.keys(result.headers).forEach(key => {
          res.setHeader(key, result.headers[key])
        })
      }

      // Parse and send body
      const body = typeof result.body === 'string' 
        ? JSON.parse(result.body) 
        : result.body
      
      res.json(body)
    } catch (error) {
      console.error('Error in Vercel wrapper:', error)
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}

module.exports = { createVercelHandler }

