const { handler } = require('../netlify/functions/add-player')
const { getPlayers, removePlayer } = require('../netlify/functions/utils/player-storage')

// Mock context for Netlify Functions
const createMockContext = () => ({
  site: {
    id: 'test-site-id'
  }
})

// Mock event
const createMockEvent = (body) => ({
  httpMethod: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify(body)
})

describe('add-player integration test with real API', () => {
  const testPlayerId = '152445905'
  let mockContext

  beforeEach(() => {
    mockContext = createMockContext()
  })

  afterEach(async () => {
    // Clean up: remove test player if it exists
    try {
      await removePlayer(testPlayerId, mockContext)
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  test('should successfully add player 152445905 with real Kingshot API', async () => {
    const event = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null // Skip reCAPTCHA for testing
    })

    console.log(`Testing with player ID: ${testPlayerId}`)
    const response = await handler(event, mockContext)
    const body = JSON.parse(response.body)

    console.log('Response status:', response.statusCode)
    console.log('Response body:', JSON.stringify(body, null, 2))

    if (response.statusCode !== 200) {
      console.error('Failed to add player. Error:', body.error)
      console.error('Message:', body.message)
      if (body.stack) {
        console.error('Stack:', body.stack)
      }
    }

    expect(response.statusCode).toBe(200)
    expect(body.success).toBe(true)
    expect(body.playerId).toBe(testPlayerId)
    expect(body.verified).toBe(true)
    expect(body.verificationData).toBeDefined()
  }, 60000) // 60 second timeout for real API call

  test('should verify player data is persisted correctly', async () => {
    // Add player
    const event = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null
    })

    const response = await handler(event, mockContext)
    expect(response.statusCode).toBe(200)

    // Verify player is in storage
    const players = await getPlayers(mockContext)
    const player = players.players.find(p => {
      const id = typeof p === 'string' ? p : p.id
      return id === testPlayerId
    })

    expect(player).toBeDefined()
    expect(player.id).toBe(testPlayerId)
    expect(player.verified).toBe(true)
    expect(player.verificationData).toBeDefined()
    
    // Check if player name is in verification data
    if (player.verificationData) {
      console.log('Player verification data:', JSON.stringify(player.verificationData, null, 2))
      expect(player.verificationData).toBeTruthy()
    }
  }, 60000)
})

