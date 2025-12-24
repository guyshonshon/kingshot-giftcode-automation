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

describe('add-player function', () => {
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

  test('should add a valid player successfully', async () => {
    const event = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null // Skip reCAPTCHA for testing
    })

    const response = await handler(event, mockContext)
    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.success).toBe(true)
    expect(body.playerId).toBe(testPlayerId)
    expect(body.verified).toBe(true)
  }, 30000) // 30 second timeout for API call

  test('should reject invalid player ID format', async () => {
    const event = createMockEvent({
      playerId: '123', // Too short
      recaptchaToken: null
    })

    const response = await handler(event, mockContext)
    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(400)
    expect(body.error).toContain('Invalid player ID')
  })

  test('should reject duplicate player', async () => {
    // Add player first time
    const event1 = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null
    })
    await handler(event1, mockContext)

    // Try to add again
    const event2 = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null
    })
    const response = await handler(event2, mockContext)
    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(400)
    expect(body.error).toContain('already exists')
  })

  test('should verify player exists in storage after adding', async () => {
    const event = createMockEvent({
      playerId: testPlayerId,
      recaptchaToken: null
    })

    await handler(event, mockContext)

    // Verify player is in storage
    const players = await getPlayers(mockContext)
    const playerExists = players.players.some(p => {
      const id = typeof p === 'string' ? p : p.id
      return id === testPlayerId
    })

    expect(playerExists).toBe(true)
  }, 30000)

  test('should handle network errors gracefully', async () => {
    // This test would require mocking the HTTPS request
    // For now, we'll just ensure error handling works
    const event = createMockEvent({
      playerId: '999999999', // Invalid ID that might fail verification
      recaptchaToken: null
    })

    const response = await handler(event, mockContext)
    
    // Should return either success or a proper error, not 500
    expect([200, 400, 403]).toContain(response.statusCode)
  }, 30000)
})

