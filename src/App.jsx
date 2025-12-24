import React, { useState, useEffect } from 'react'
import './App.css'
import PlayerManagement from './components/PlayerManagement'
import GiftCodeRedemption from './components/GiftCodeRedemption'
import Statistics from './components/Statistics'
import ActivityLog from './components/ActivityLog'
import TermsOfService from './components/TermsOfService'
import MessageBanner from './components/MessageBanner'
import GiftIcon from './components/GiftIcon'

const API_BASE = '/.netlify/functions'

function App() {
  const [showTOS, setShowTOS] = useState(false)
  const [players, setPlayers] = useState([])
  const [activePlayerId, setActivePlayerId] = useState(null) // Currently selected/logged in player
  const [stats, setStats] = useState({
    totalGifts: 0,
    successfulRedeems: 0,
    failedRedeems: 0
  })
  const [playerStats, setPlayerStats] = useState({}) // Individual player stats
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    await loadPlayers()
    await loadStats()
    setLoading(false)
  }

  const loadPlayers = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-players`)
      const data = await response.json()
      const loadedPlayers = data.players || []
      setPlayers(loadedPlayers)
      
      // Set first player as active if none is set
      if (loadedPlayers.length > 0 && !activePlayerId) {
        setActivePlayerId(loadedPlayers[0])
      }
      
      // Load individual player stats
      if (loadedPlayers.length > 0) {
        await loadPlayerStats(loadedPlayers)
      }
    } catch (error) {
      console.error('Error loading players:', error)
      addActivity('Error loading players', 'error')
    }
  }

  const loadPlayerStats = async (playerIds) => {
    try {
      const response = await fetch(`${API_BASE}/get-player-stats?players=${playerIds.join(',')}`)
      const data = await response.json()
      if (data.success) {
        setPlayerStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error loading player stats:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-stats`)
      const data = await response.json()
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const saveStats = async (newStats) => {
    try {
      await fetch(`${API_BASE}/save-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: newStats })
      })
    } catch (error) {
      console.error('Error saving stats:', error)
    }
  }

  const addActivity = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString()
    const newActivity = { message, type, time, id: Date.now() }
    setActivities(prev => [newActivity, ...prev].slice(0, 50))
  }

  const handlePlayerAdded = async (playerId) => {
    setPlayers(prev => [...prev, playerId])
    if (!activePlayerId) {
      setActivePlayerId(playerId)
    }
    addActivity(`Added player: ${playerId}`, 'success')
    await loadPlayerStats([...players, playerId])
  }

  const handlePlayerRemoved = (playerId) => {
    setPlayers(prev => prev.filter(id => id !== playerId))
    if (activePlayerId === playerId) {
      const remaining = players.filter(id => id !== playerId)
      setActivePlayerId(remaining.length > 0 ? remaining[0] : null)
    }
    addActivity(`Removed player: ${playerId}`, 'success')
    const newPlayerStats = { ...playerStats }
    delete newPlayerStats[playerId]
    setPlayerStats(newPlayerStats)
  }

  const handleRedeemComplete = async (result) => {
    const newStats = {
      totalGifts: stats.totalGifts + players.length,
      successfulRedeems: stats.successfulRedeems + (result.successCount || 0),
      failedRedeems: stats.failedRedeems + (result.failCount || 0)
    }
    setStats(newStats)
    saveStats(newStats)
    
    // Update player stats
    if (players.length > 0) {
      await loadPlayerStats(players)
    }
    
    addActivity(
      `Redeemed "${result.giftCode}" for ${result.successCount || 0} player(s)`,
      result.failCount > 0 ? 'warning' : 'success'
    )
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (showTOS) {
    return <TermsOfService onBack={() => setShowTOS(false)} />
  }

  return (
    <div className="app-container">
      <MessageBanner totalGiftsRedeemed={stats.totalGifts} />
      
      <header className="app-header">
        <div className="header-icon">
          <GiftIcon size={48} />
        </div>
        <h1>Matry's Giftcode Automation</h1>
        <p className="subtitle">This tool claims gifts for you automatically, just add your player id and enjoy :)</p>
      </header>

      <main className="main-content">
        <div className="top-sections">
          <PlayerManagement
            players={players}
            onPlayerAdded={handlePlayerAdded}
            onPlayerRemoved={handlePlayerRemoved}
            addActivity={addActivity}
            onCodeClaimed={() => loadPlayerStats(players)}
          />

          <GiftCodeRedemption
            players={players}
            onRedeemComplete={handleRedeemComplete}
            addActivity={addActivity}
          />
        </div>

        <Statistics
          totalPlayers={players.length}
          stats={stats}
          activePlayerId={activePlayerId}
          playerStats={playerStats}
        />

        <ActivityLog 
          activities={activities} 
          players={players} 
          onCodeClaimed={() => loadPlayerStats(players)}
        />
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="copyright">
            © {new Date().getFullYear()} Matry Dminit. All rights reserved.
          </p>
          <p className="disclaimer">
            By submitting your Player ID and/or redeeming gift codes, and by visiting this website, 
            you acknowledge that your actions and data may be recorded and stored on our end, including but not limited to 
            your IP address, Player ID, gift codes redeemed, timestamps, and other usage information. 
            This data may be used for service operation, security, and analytics purposes.
          </p>
          <p className="tos-link">
            <a href="#" onClick={(e) => { e.preventDefault(); setShowTOS(true); }}>Terms of Service</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

