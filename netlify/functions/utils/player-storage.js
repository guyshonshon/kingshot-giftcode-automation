const { getStore } = require('@netlify/blobs')
const fs = require('fs').promises
const path = require('path')
const { supabase, isSupabaseAvailable } = require('./supabase-client')

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

// Get players - try Supabase first, then Blobs, then file
async function getPlayers(context) {
  // Try Supabase first (if available)
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('added_at', { ascending: false })
      
      if (error) {
        console.warn('Supabase error, falling back:', error.message)
      } else if (data) {
        // Convert Supabase format to our format
        const players = data.map(row => ({
          id: row.player_id,
          addedAt: row.added_at,
          lastClaimed: row.last_claimed,
          totalClaims: row.total_claims || 0,
          verified: row.verified || false,
          verificationData: row.verification_data || null
        }))
        return { players }
      }
    } catch (error) {
      console.warn('Supabase not available, using fallback:', error.message)
    }
  }
  
  // Try Netlify Blobs (if available)
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

// Save players - try Supabase first, then Blobs, then file
async function savePlayers(playersData, context) {
  // Try Supabase first (if available)
  if (isSupabaseAvailable()) {
    try {
      // Delete all existing players
      await supabase.from('players').delete().neq('player_id', '')
      
      // Insert all players
      const playersToInsert = playersData.players.map(player => ({
        player_id: typeof player === 'string' ? player : player.id,
        added_at: typeof player === 'string' ? new Date().toISOString() : (player.addedAt || new Date().toISOString()),
        last_claimed: typeof player === 'string' ? null : (player.lastClaimed || null),
        total_claims: typeof player === 'string' ? 0 : (player.totalClaims || 0),
        verified: typeof player === 'string' ? false : (player.verified || false),
        verification_data: typeof player === 'string' ? null : (player.verificationData || null)
      }))
      
      const { error } = await supabase
        .from('players')
        .insert(playersToInsert)
      
      if (error) {
        console.warn('Supabase save error, using fallback:', error.message)
      } else {
        console.log('Saved to Supabase successfully')
        // Also save to file as backup
        try {
          await ensureDataFile()
          await fs.writeFile(DATA_FILE, JSON.stringify(playersData), 'utf8')
        } catch (e) {
          // Ignore file save errors if Supabase worked
        }
        return true
      }
    } catch (error) {
      console.warn('Supabase not available, using fallback:', error.message)
    }
  }
  
  // Try Netlify Blobs (if available)
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
  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('player_id', String(playerId).trim())
      
      if (!error) {
        console.log('Removed from Supabase successfully')
        return { success: true, data: { players: [] } }
      }
    } catch (error) {
      console.warn('Supabase remove failed, using fallback:', error.message)
    }
  }
  
  // Fallback to file-based approach
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
  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      const normalizedId = String(playerId).trim()
      const updateData = {}
      
      if (updates.lastClaimed) updateData.last_claimed = updates.lastClaimed
      if (updates.totalClaims !== undefined) updateData.total_claims = updates.totalClaims
      if (updates.verified !== undefined) updateData.verified = updates.verified
      if (updates.verificationData) updateData.verification_data = updates.verificationData
      
      const { data, error } = await supabase
        .from('players')
        .update(updateData)
        .eq('player_id', normalizedId)
        .select()
        .single()
      
      if (!error && data) {
        console.log('Updated in Supabase successfully')
        // Convert back to our format
        const player = {
          id: data.player_id,
          addedAt: data.added_at,
          lastClaimed: data.last_claimed,
          totalClaims: data.total_claims || 0,
          verified: data.verified || false,
          verificationData: data.verification_data || null
        }
        return { success: true, data: { players: [player] }, player }
      }
    } catch (error) {
      console.warn('Supabase update failed, using fallback:', error.message)
    }
  }
  
  // Fallback to file-based approach
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
  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('player_id')
        .eq('player_id', String(playerId).trim())
        .single()
      
      if (!error && data) {
        return true
      }
    } catch (error) {
      // Not found or error, continue to fallback
    }
  }
  
  // Fallback to file-based approach
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
