// Express server - SIMPLE deployment
// Handles all API routes and serves static files

const express = require('express')
const path = require('path')
const cors = require('cors')

// Initialize database
require('./db')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// Import all Netlify functions
const addPlayer = require('./netlify/functions/add-player')
const removePlayer = require('./netlify/functions/remove-player')
const getPlayers = require('./netlify/functions/get-players')
const getPlayerStats = require('./netlify/functions/get-player-stats')
const getStats = require('./netlify/functions/get-stats')
const saveStats = require('./netlify/functions/save-stats')
const redeemGiftcode = require('./netlify/functions/redeem-giftcode')
const claimSingleCode = require('./netlify/functions/claim-single-code')
const claimForSelf = require('./netlify/functions/claim-for-self')
const getCodesWithClaims = require('./netlify/functions/get-codes-with-claims')
const getRecentCodes = require('./netlify/functions/get-recent-codes')
const scrapeGiftcodes = require('./netlify/functions/scrape-giftcodes')
const autoClaim = require('./netlify/functions/auto-claim')
const getAuditLogs = require('./netlify/functions/get-audit-logs')
const checkExpiredCodes = require('./netlify/functions/check-expired-codes')

// Mock context for Netlify functions
const mockContext = {}

// Helper to convert Express req/res to Netlify event/context
function createNetlifyEvent(req) {
  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: {},
    queryStringParameters: req.query || {},
    headers: req.headers,
    body: req.method === 'POST' || req.method === 'PUT' 
      ? JSON.stringify(req.body || {}) 
      : null,
    isBase64Encoded: false
  }
}

// API Routes - map to Netlify functions
app.post('/.netlify/functions/add-player', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await addPlayer.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/remove-player', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await removePlayer.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-players', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getPlayers.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-player-stats', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getPlayerStats.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-stats', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getStats.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/save-stats', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await saveStats.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/redeem-giftcode', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await redeemGiftcode.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/claim-single-code', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await claimSingleCode.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/claim-for-self', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await claimForSelf.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-codes-with-claims', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getCodesWithClaims.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-recent-codes', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getRecentCodes.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/scrape-giftcodes', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await scrapeGiftcodes.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/auto-claim', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await autoClaim.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.get('/.netlify/functions/get-audit-logs', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await getAuditLogs.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

app.post('/.netlify/functions/check-expired-codes', async (req, res) => {
  const event = createNetlifyEvent(req)
  const result = await checkExpiredCodes.handler(event, mockContext)
  res.status(result.statusCode).json(JSON.parse(result.body))
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

