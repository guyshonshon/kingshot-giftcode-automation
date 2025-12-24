// Simple storage using SQLite - no external services!
const db = require('../../../db')

// Get players
async function getPlayers() {
  const rows = db.prepare('SELECT * FROM players ORDER BY added_at DESC').all()
  return {
    players: rows.map(row => ({
      id: row.player_id,
      addedAt: row.added_at,
      lastClaimed: row.last_claimed,
      totalClaims: row.total_claims || 0,
      verified: row.verified === 1,
      verificationData: row.verification_data ? JSON.parse(row.verification_data) : null
    }))
  }
}

// Save players (for compatibility, but we use direct DB operations)
async function savePlayers(playersData) {
  // Not needed - we use direct DB operations
  return true
}

// Add a player
async function addPlayer(playerData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO players (player_id, added_at, last_claimed, total_claims, verified, verification_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      playerData.id,
      playerData.addedAt || new Date().toISOString(),
      playerData.lastClaimed || null,
      playerData.totalClaims || 0,
      playerData.verified ? 1 : 0,
      playerData.verificationData ? JSON.stringify(playerData.verificationData) : null
    )
    
    return { success: true, data: await getPlayers() }
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return { success: false, error: 'Player already exists' }
    }
    throw error
  }
}

// Remove a player
async function removePlayer(playerId) {
  const stmt = db.prepare('DELETE FROM players WHERE player_id = ?')
  const result = stmt.run(String(playerId).trim())
  
  if (result.changes === 0) {
    return { success: false, error: 'Player not found' }
  }
  
  return { success: true, data: await getPlayers() }
}

// Update player
async function updatePlayer(playerId, updates) {
  const normalizedId = String(playerId).trim()
  const setParts = []
  const values = []
  
  if (updates.lastClaimed !== undefined) {
    setParts.push('last_claimed = ?')
    values.push(updates.lastClaimed)
  }
  if (updates.totalClaims !== undefined) {
    setParts.push('total_claims = ?')
    values.push(updates.totalClaims)
  }
  if (updates.verified !== undefined) {
    setParts.push('verified = ?')
    values.push(updates.verified ? 1 : 0)
  }
  if (updates.verificationData !== undefined) {
    setParts.push('verification_data = ?')
    values.push(JSON.stringify(updates.verificationData))
  }
  
  if (setParts.length === 0) {
    return { success: false, error: 'No updates provided' }
  }
  
  values.push(normalizedId)
  const stmt = db.prepare(`UPDATE players SET ${setParts.join(', ')} WHERE player_id = ?`)
  const result = stmt.run(...values)
  
  if (result.changes === 0) {
    return { success: false, error: 'Player not found' }
  }
  
  const playerRow = db.prepare('SELECT * FROM players WHERE player_id = ?').get(normalizedId)
  const player = {
    id: playerRow.player_id,
    addedAt: playerRow.added_at,
    lastClaimed: playerRow.last_claimed,
    totalClaims: playerRow.total_claims || 0,
    verified: playerRow.verified === 1,
    verificationData: playerRow.verification_data ? JSON.parse(playerRow.verification_data) : null
  }
  
  return { success: true, data: await getPlayers(), player }
}

// Check if player exists
async function playerExists(playerId) {
  const stmt = db.prepare('SELECT 1 FROM players WHERE player_id = ? LIMIT 1')
  const result = stmt.get(String(playerId).trim())
  return !!result
}

module.exports = {
  getPlayers,
  savePlayers,
  addPlayer,
  removePlayer,
  updatePlayer,
  playerExists
}

