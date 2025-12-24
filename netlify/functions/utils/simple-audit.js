// Simple audit logging using SQLite
const db = require('../../../db')

function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['client-ip'] ||
         event.headers['x-real-ip'] ||
         'unknown'
}

function getUserAgent(event) {
  return event.headers['user-agent'] || 'unknown'
}

async function logAuditEvent(event, context, action, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (timestamp, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      new Date().toISOString(),
      action,
      getClientIP(event),
      getUserAgent(event),
      JSON.stringify(details)
    )
    
    return { timestamp: new Date().toISOString(), action, ...details }
  } catch (error) {
    console.error('Error logging audit event:', error)
    return null
  }
}

async function logPlayerAdded(event, context, playerId, success) {
  return await logAuditEvent(event, context, 'PLAYER_ADDED', {
    playerId,
    success,
    details: `Player ID ${playerId} was ${success ? 'successfully added' : 'failed to add'}`
  })
}

async function logPlayerRemoved(event, context, playerId, success) {
  return await logAuditEvent(event, context, 'PLAYER_REMOVED', {
    playerId,
    success,
    details: `Player ID ${playerId} was ${success ? 'successfully removed' : 'failed to remove'}`
  })
}

async function logCodeRedemption(event, context, giftCode, players, results) {
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const playerIds = players.map(p => typeof p === 'string' ? p : p.id)

  return await logAuditEvent(event, context, 'CODE_REDEEMED', {
    giftCode,
    totalPlayers: players.length,
    successCount,
    failCount,
    playerIds,
    results: results.map(r => ({
      playerId: r.playerId,
      success: r.success,
      error: r.error || null
    })),
    details: `Gift code ${giftCode} redeemed for ${players.length} player(s). ${successCount} successful, ${failCount} failed.`
  })
}

async function logSingleCodeClaim(event, context, playerId, giftCode, success, error = null) {
  return await logAuditEvent(event, context, 'SINGLE_CODE_CLAIMED', {
    playerId,
    giftCode,
    success,
    error,
    details: `Player ${playerId} ${success ? 'successfully claimed' : 'failed to claim'} code ${giftCode}`
  })
}

async function logAutoClaim(event, context, codesClaimed, totalCodes, results) {
  return await logAuditEvent(event, context, 'AUTO_CLAIM', {
    codesClaimed,
    totalCodes,
    totalClaimed: codesClaimed.length,
    results: results.map(r => ({
      playerId: r.playerId,
      giftCode: r.giftCode,
      success: r.success,
      error: r.error || null
    })),
    details: `Auto-claim processed ${totalCodes} codes. Successfully claimed ${codesClaimed.length} codes.`
  })
}

async function getAuditLogs(context, limit = 100) {
  try {
    const query = limit && limit > 0
      ? db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?')
      : db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC')
    
    const rows = limit && limit > 0 ? query.all(limit) : query.all()
    
    return rows.map(row => ({
      timestamp: row.timestamp,
      action: row.action,
      ip: row.ip_address,
      userAgent: row.user_agent,
      ...JSON.parse(row.details || '{}')
    }))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}

module.exports = {
  getClientIP,
  getUserAgent,
  logAuditEvent,
  logPlayerAdded,
  logPlayerRemoved,
  logCodeRedemption,
  logSingleCodeClaim,
  logAutoClaim,
  getAuditLogs
}

