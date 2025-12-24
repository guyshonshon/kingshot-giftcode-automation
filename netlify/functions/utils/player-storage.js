const { getStore } = require('@netlify/blobs')
const fs = require('fs').promises
const path = require('path')

const PLAYERS_STORE_NAME = 'players-data'
const PLAYERS_KEY = 'players'
const DATA_FILE = path.join('/tmp', 'players.json')

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ players: [] }), 'utf8')
  }
}

// Get players - try Blobs first, fallback to file
async function getPlayers(context) {
  // Try Netlify Blobs first (if available)
  try {
    const store = getStore({
      name: PLAYERS_STORE_NAME
    })
    const data = await store.get(PLAYERS_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Blobs not available, using file storage:', error.message)
  }
  
  // Fallback to file storage
  try {
    await ensureDataFile()
    const data = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading players file:', error)
    return { players: [] }
  }
}

// Save players - try Blobs first, always save to file as backup
async function savePlayers(playersData, context) {
  // Try Netlify Blobs first (if available)
  try {
    const store = getStore({
      name: PLAYERS_STORE_NAME
    })
    await store.set(PLAYERS_KEY, JSON.stringify(playersData))
    console.log('Saved to Blobs successfully')
  } catch (error) {
    console.warn('Blobs save failed, using file storage:', error.message)
  }
  
  // Always save to file as primary/backup storage
  try {
    await ensureDataFile()
    await fs.writeFile(DATA_FILE, JSON.stringify(playersData), 'utf8')
    console.log('Saved to file successfully')
    return true
  } catch (error) {
    console.error('Error saving players file:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    return false
  }
}

// Add a player
async function addPlayer(playerData, context) {
  const data = await getPlayers(context)
  if (!data.players) {
    data.players = []
  }
  
  // Check if player already exists
  const exists = data.players.some(p => 
    typeof p === 'string' ? p === playerData.id : p.id === playerData.id
  )
  
  if (exists) {
    return { success: false, error: 'Player already exists' }
  }
  
  data.players.push(playerData)
  const saved = await savePlayers(data, context)
  
  return { success: saved, data }
}

// Remove a player
async function removePlayer(playerId, context) {
  const data = await getPlayers(context)
  if (!data.players) {
    return { success: false, error: 'No players found' }
  }
  
  const normalizedId = String(playerId).trim()
  const initialLength = data.players.length
  
  data.players = data.players.filter(p => {
    if (typeof p === 'string') {
      return String(p).trim() !== normalizedId
    } else if (p && p.id) {
      return String(p.id).trim() !== normalizedId
    }
    return true
  })
  
  if (data.players.length === initialLength) {
    return { success: false, error: 'Player not found' }
  }
  
  const saved = await savePlayers(data, context)
  return { success: saved, data }
}

// Update player metadata
async function updatePlayer(playerId, updates, context) {
  const data = await getPlayers(context)
  if (!data.players) {
    return { success: false, error: 'No players found' }
  }
  
  const normalizedId = String(playerId).trim()
  const playerIndex = data.players.findIndex(p => {
    if (typeof p === 'string') {
      return String(p).trim() === normalizedId
    } else if (p && p.id) {
      return String(p.id).trim() === normalizedId
    }
    return false
  })
  
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found' }
  }
  
  // Update player
  if (typeof data.players[playerIndex] === 'string') {
    data.players[playerIndex] = {
      id: normalizedId,
      addedAt: new Date().toISOString(),
      ...updates
    }
  } else {
    data.players[playerIndex] = {
      ...data.players[playerIndex],
      ...updates
    }
  }
  
  const saved = await savePlayers(data, context)
  return { success: saved, data, player: data.players[playerIndex] }
}

// Check if player exists
async function playerExists(playerId, context) {
  const data = await getPlayers(context)
  if (!data.players) {
    return false
  }
  
  const normalizedId = String(playerId).trim()
  return data.players.some(p => {
    if (typeof p === 'string') {
      return String(p).trim() === normalizedId
    } else if (p && p.id) {
      return String(p.id).trim() === normalizedId
    }
    return false
  })
}

module.exports = {
  getPlayers,
  savePlayers,
  addPlayer,
  removePlayer,
  updatePlayer,
  playerExists
}

