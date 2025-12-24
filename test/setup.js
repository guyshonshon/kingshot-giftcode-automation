// Mock Netlify Blobs for testing
const fs = require('fs').promises
const path = require('path')

// Create a test data directory
const TEST_DATA_DIR = path.join(__dirname, '../test-data')

// Override @netlify/blobs getStore for testing
jest.mock('@netlify/blobs', () => {
  const fs = require('fs').promises
  const path = require('path')
  const TEST_DATA_DIR = path.join(__dirname, '../../test-data')
  
  const ensureTestDataDir = async () => {
    try {
      await fs.mkdir(TEST_DATA_DIR, { recursive: true })
    } catch (e) {
      // Directory might already exist
    }
  }
  
  return {
    getStore: jest.fn((options) => {
      const storeName = options.name
      
      return {
        get: async (key) => {
          await ensureTestDataDir()
          try {
            const filePath = path.join(TEST_DATA_DIR, `${storeName}-${key}.json`)
            const data = await fs.readFile(filePath, 'utf8')
            return data
          } catch (e) {
            return null
          }
        },
        set: async (key, value) => {
          await ensureTestDataDir()
          const filePath = path.join(TEST_DATA_DIR, `${storeName}-${key}.json`)
          await fs.writeFile(filePath, value, 'utf8')
        },
        delete: async (key) => {
          await ensureTestDataDir()
          const filePath = path.join(TEST_DATA_DIR, `${storeName}-${key}.json`)
          try {
            await fs.unlink(filePath)
          } catch (e) {
            // File might not exist
          }
        }
      }
    })
  }
})

// Clean up test data before each test
beforeEach(async () => {
  try {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true })
    const files = await fs.readdir(TEST_DATA_DIR)
    for (const file of files) {
      await fs.unlink(path.join(TEST_DATA_DIR, file))
    }
  } catch (e) {
    // Directory might be empty or not exist
  }
})

// Clean up after all tests
afterAll(async () => {
  try {
    const files = await fs.readdir(TEST_DATA_DIR)
    for (const file of files) {
      await fs.unlink(path.join(TEST_DATA_DIR, file))
    }
    await fs.rmdir(TEST_DATA_DIR)
  } catch (e) {
    // Ignore cleanup errors
  }
})

