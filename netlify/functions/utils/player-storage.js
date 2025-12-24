const { getStore } = require('@netlify/blobs')

const PLAYERS_STORE_NAME = 'players-data'
const PLAYERS_KEY = 'players'

// Get players from Netlify Blobs
async function getPlayers() {
  try {
    const store = getStore({
      name: PLAYERS_STORE_NAME
    })
    
    const data = await store.get(PLAYERS_KEY)
    if (!data) {
      return { players: [] }
    }
    
    return JSON.parse(data)
  } catch (error) {
    console.error('Error getting players from Blobs:', error)
    return { players: [] }
  }
}

// Save players to Netlify Blobs
async function savePlayers(playersData) {
  try {
    const store = getStore({
      name: PLAYERS_STORE_NAME
    })
    
    await store.set(PLAYERS_KEY, JSON.stringify(playersData))
    return true
  } catch (error) {
    console.error('Error saving players to Blobs:', error)
    return false
  }
}

// Add a player
async function addPlayer(playerData) {
  const data = await getPlayers()
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
  const saved = await savePlayers(data)
  
  return { success: saved, data }
}

// Remove a player
async function removePlayer(playerId) {
  const data = await getPlayers()
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
  
  const saved = await savePlayers(data)
  return { success: saved, data }
}

// Update player metadata
async function updatePlayer(playerId, updates) {
  const data = await getPlayers()
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
  
  const saved = await savePlayers(data)
  return { success: saved, data, player: data.players[playerIndex] }
}

// Check if player exists
async function playerExists(playerId) {
  const data = await getPlayers()
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

