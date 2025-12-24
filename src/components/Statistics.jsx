import React from 'react'
import '../App.css'

function Statistics({ totalPlayers, stats, activePlayerId, playerStats }) {
  const yourTotalGifts = activePlayerId ? (playerStats[activePlayerId]?.totalClaims || 0) : null
  const hasPlayerStats = yourTotalGifts !== null

  return (
    <div className="section">
      <h2 className="section-title">Statistics</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{totalPlayers}</div>
          <div className="stat-label">Active Players</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalGifts}</div>
          <div className="stat-label">Total Gifts</div>
        </div>
        <div className={`stat-item ${!hasPlayerStats ? 'stat-item-disabled' : ''}`}>
          <div className={`stat-value ${!hasPlayerStats ? 'stat-value-disabled' : ''}`}>
            {hasPlayerStats ? yourTotalGifts : '—'}
          </div>
          <div className={`stat-label ${!hasPlayerStats ? 'stat-label-disabled' : ''}`}>
            Player's Total Gifts Redeemed
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics
