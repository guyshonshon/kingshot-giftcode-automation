const { getStore } = require('@netlify/blobs')
const { supabase, isSupabaseAvailable } = require('./supabase-client')

// Get client IP from event headers
function getClientIP(event) {
  return event.headers['x-nf-client-connection-ip'] || 
         event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['client-ip'] ||
         event.headers['x-real-ip'] ||
         'unknown'
}

// Get user agent
function getUserAgent(event) {
  return event.headers['user-agent'] || 'unknown'
}

// Create audit log entry
async function logAuditEvent(event, context, action, details) {
  try {
    const timestamp = new Date().toISOString()
    const ip = getClientIP(event)
    const userAgent = getUserAgent(event)
    
    const logEntry = {
      timestamp,
      action,
      ip,
      userAgent,
      ...details
    }

    // Try Supabase first (if available)
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from('audit_logs')
          .insert({
            timestamp,
            action,
            ip_address: ip,
            user_agent: userAgent,
            details: JSON.stringify(details)
          })
        
        if (!error) {
          // Also maintain recent logs list in Supabase
          await updateRecentLogs(logEntry)
          return logEntry
        }
      } catch (error) {
        console.warn('Supabase audit log failed, using fallback:', error.message)
      }
    }
    
    // Fallback to Netlify Blobs
    try {
      const store = getStore({
        name: 'audit-logs'
      })

      // Append to audit log (using timestamp as key for sorting)
      const logKey = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await store.set(logKey, JSON.stringify(logEntry))

      // Also maintain a recent logs list (last 1000 entries)
      const recentLogsKey = 'recent-logs'
      let recentLogs = []
      try {
        const existing = await store.get(recentLogsKey)
        if (existing) {
          recentLogs = JSON.parse(existing)
        }
      } catch (e) {
        // First time, empty array
      }

      recentLogs.unshift(logEntry)
      // Keep all entries, no slicing
      await store.set(recentLogsKey, JSON.stringify(recentLogs))

      return logEntry
    } catch (error) {
      console.error('Error logging audit event:', error)
      // Don't fail the request if logging fails
      return null
    }
  } catch (error) {
    console.error('Error in logAuditEvent:', error)
    return null
  }
}

// Update recent logs in Supabase
async function updateRecentLogs(logEntry) {
  if (!isSupabaseAvailable()) return
  
  try {
    // Get current recent logs count
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
    
    // Insert new log (it will be most recent due to timestamp)
    // No need to maintain a separate recent-logs table, we can query by timestamp
    // The logEntry is already inserted in logAuditEvent
  } catch (error) {
    console.warn('Failed to update recent logs:', error.message)
  }
}

// Log player added
async function logPlayerAdded(event, context, playerId, success) {
  return await logAuditEvent(event, context, 'PLAYER_ADDED', {
    playerId,
    success,
    details: `Player ID ${playerId} was ${success ? 'successfully added' : 'failed to add'}`
  })
}

// Log player removed
async function logPlayerRemoved(event, context, playerId, success) {
  return await logAuditEvent(event, context, 'PLAYER_REMOVED', {
    playerId,
    success,
    details: `Player ID ${playerId} was ${success ? 'successfully removed' : 'failed to remove'}`
  })
}

// Log code redemption
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
    details: `Gift code ${giftCode} redeemed for ${players.length} player(s). ${successCount} successful, ${failCount} failed. Players: ${playerIds.join(', ')}`
  })
}

// Log single code claim
async function logSingleCodeClaim(event, context, playerId, giftCode, success, error = null) {
  return await logAuditEvent(event, context, 'SINGLE_CODE_CLAIMED', {
    playerId,
    giftCode,
    success,
    error,
    details: `Player ${playerId} ${success ? 'successfully claimed' : 'failed to claim'} code ${giftCode}${error ? `. Error: ${error}` : ''}`
  })
}

// Log auto-claim
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

// Get audit logs
async function getAuditLogs(context, limit = 100) {
  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
      
      if (limit && limit > 0) {
        query = query.limit(limit)
      }
      
      const { data, error } = await query
      
      if (!error && data) {
        // Convert Supabase format to our format
        return data.map(row => ({
          timestamp: row.timestamp,
          action: row.action,
          ip: row.ip_address,
          userAgent: row.user_agent,
          ...JSON.parse(row.details || '{}')
        }))
      }
    } catch (error) {
      console.warn('Supabase get audit logs failed, using fallback:', error.message)
    }
  }
  
  // Fallback to Netlify Blobs
  try {
    const store = getStore({
      name: 'audit-logs'
    })

    const recentLogsKey = 'recent-logs'
    const recentLogs = await store.get(recentLogsKey)
    
    if (!recentLogs) {
      return []
    }

    const logs = JSON.parse(recentLogs)
    // If limit is specified, return only that many (for display purposes)
    // But all logs are still stored permanently
    if (limit && limit > 0) {
      return logs.slice(0, limit)
    }
    // Return all logs if no limit specified
    return logs
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
