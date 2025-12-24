import React, { useState, useEffect } from 'react'
import './App.css'
import PlayerManagement from './components/PlayerManagement'
import GiftCodeRedemption from './components/GiftCodeRedemption'
import Statistics from './components/Statistics'
import ActivityLog from './components/ActivityLog'
import TermsOfService from './components/TermsOfService'
import MessageBanner from './components/MessageBanner'
import ToastContainer from './components/ToastContainer'
import GiftIcon from './components/GiftIcon'

const API_BASE = '/.netlify/functions'

function App() {
  const [showTOS, setShowTOS] = useState(false)
  const [players, setPlayers] = useState([])
  const [activePlayerId, setActivePlayerId] = useState(() => {
    // Load from localStorage on init
    return localStorage.getItem('activePlayerId') || null
  })
  const [stats, setStats] = useState({
    totalGifts: 0,
    successfulRedeems: 0,
    failedRedeems: 0
  })
  const [playerStats, setPlayerStats] = useState({}) // Individual player stats
  const [playerData, setPlayerData] = useState({}) // Player verification data (name, etc.)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

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
      
      // Set first player as active if none is set and it exists in the list
      if (loadedPlayers.length > 0 && !activePlayerId) {
        const savedId = localStorage.getItem('activePlayerId')
        if (savedId && loadedPlayers.includes(savedId)) {
          setActivePlayerId(savedId)
        } else {
          setActivePlayerId(loadedPlayers[0])
          localStorage.setItem('activePlayerId', loadedPlayers[0])
        }
      } else if (activePlayerId && !loadedPlayers.includes(activePlayerId)) {
        // Active player was removed, clear it
        setActivePlayerId(null)
        localStorage.removeItem('activePlayerId')
      }
      
      // Store player data (including names) for display
      if (data.playersData) {
        const dataMap = {}
        data.playersData.forEach(p => {
          const id = typeof p === 'string' ? p : p.id
          dataMap[id] = typeof p === 'object' ? p : { id: p, verified: false }
        })
        setPlayerData(dataMap)
      }
      
      // Load individual player stats
      if (loadedPlayers.length > 0) {
        await loadPlayerStats(loadedPlayers)
      }
    } catch (error) {
      console.error('Error loading players:', error)
      if (error.message.includes('JSON')) {
        // Netlify functions not available in dev - use netlify dev
        showToast('Run "netlify dev" to test functions locally', 'warning', 5000)
      } else {
        showToast('Error loading players', 'error')
      }
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
      if (!error.message.includes('JSON')) {
        showToast('Error loading stats', 'error')
      }
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

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const handlePlayerAdded = async (playerId, playerInfo = null) => {
    setPlayers(prev => [...prev, playerId])
    if (!activePlayerId) {
      setActivePlayerId(playerId)
      localStorage.setItem('activePlayerId', playerId)
    }
    
    // Update player data if provided
    if (playerInfo) {
      setPlayerData(prev => ({
        ...prev,
        [playerId]: playerInfo
      }))
    }
    
    addActivity(`Added player: ${playerId}`, 'success')
    await loadPlayerStats([...players, playerId])
  }

  const handlePlayerRemoved = (playerId) => {
    setPlayers(prev => prev.filter(id => id !== playerId))
    if (activePlayerId === playerId) {
      const remaining = players.filter(id => id !== playerId)
      const newActive = remaining.length > 0 ? remaining[0] : null
      setActivePlayerId(newActive)
      if (newActive) {
        localStorage.setItem('activePlayerId', newActive)
      } else {
        localStorage.removeItem('activePlayerId')
      }
    }
    addActivity(`Removed player: ${playerId}`, 'success')
    const newPlayerStats = { ...playerStats }
    delete newPlayerStats[playerId]
    setPlayerStats(newPlayerStats)
  }

  const handleDetachPlayer = () => {
    setActivePlayerId(null)
    localStorage.removeItem('activePlayerId')
    showToast('Player ID detached. You can add a new one.', 'info')
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
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <MessageBanner totalGiftsRedeemed={stats.totalGifts} hasPlayerId={!!activePlayerId} />
      
      <header className="app-header">
        <div className="header-icon">
          <GiftIcon size={48} />
        </div>
        <div className="header-content">
          <h1>Matry's Giftcode Automation</h1>
          <p className="subtitle">This tool claims gifts for you automatically, just add your player id and enjoy :)</p>
          {activePlayerId && playerData[activePlayerId]?.verificationData && (
            <div className="active-player-info">
              <span className="active-player-label">Logged in as:</span>
              <span className="active-player-name">
                {playerData[activePlayerId].verificationData.player_name || 
                 playerData[activePlayerId].verificationData.name || 
                 activePlayerId}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="top-sections">
          <PlayerManagement
            players={players}
            activePlayerId={activePlayerId}
            playerData={playerData}
            onPlayerAdded={handlePlayerAdded}
            onPlayerRemoved={handlePlayerRemoved}
            onDetachPlayer={handleDetachPlayer}
            addActivity={addActivity}
            showToast={showToast}
            onCodeClaimed={() => loadPlayerStats(players)}
          />

          <GiftCodeRedemption
            players={players}
            onRedeemComplete={handleRedeemComplete}
            addActivity={addActivity}
            showToast={showToast}
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
          activePlayerId={activePlayerId}
          showToast={showToast}
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

