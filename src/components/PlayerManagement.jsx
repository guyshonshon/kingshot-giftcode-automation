import React, { useState, useRef, useEffect } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import '../App.css'

const API_BASE = '/.netlify/functions'

function PlayerManagement({ players, activePlayerId, onPlayerAdded, onPlayerRemoved, onDetachPlayer, addActivity, showToast, onCodeClaimed }) {
  const [playerId, setPlayerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [claimingPlayerId, setClaimingPlayerId] = useState(null)
  const [playerData, setPlayerData] = useState({}) // Store player verification data
  const addRecaptchaRef = useRef(null)
  const removeRecaptchaRefs = useRef({})
  const claimRecaptchaRefs = useRef({})
  
  // Load player data on mount
  useEffect(() => {
    loadPlayerData()
  }, [players])
  
  const loadPlayerData = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-players`)
      if (!response.ok) {
        throw new Error('Failed to fetch')
      }
      const data = await response.json()
      if (data.playersData) {
        const dataMap = {}
        data.playersData.forEach(p => {
          const id = typeof p === 'string' ? p : p.id
          dataMap[id] = typeof p === 'object' ? p : { id: p, verified: false }
        })
        setPlayerData(dataMap)
      }
    } catch (error) {
      // Silently fail - functions may not be available in dev
      console.error('Error loading player data:', error)
    }
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    
    const trimmedId = playerId.trim()
    
    if (!trimmedId) {
      showToast('Please enter a Player ID', 'error')
      return
    }
    
    if (!/^\d{8,10}$/.test(trimmedId)) {
      showToast('Player ID must be 8-10 digits', 'error')
      return
    }
    
    if (players.includes(trimmedId)) {
      showToast('Player ID already exists', 'error')
      return
    }
    
    const recaptchaToken = addRecaptchaRef.current?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    // Only require reCAPTCHA if site key is configured
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      addActivity('Please complete the reCAPTCHA verification', 'error')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`${API_BASE}/add-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: trimmedId, recaptchaToken })
      })
      
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        // If response is not JSON (e.g., HTML error page), show helpful message
        if (!response.ok) {
          showToast('Functions not available. Run "netlify dev" to test locally.', 'error')
          setLoading(false)
          return
        }
        throw jsonError
      }
      
      if (data.success) {
        setPlayerId('')
        addRecaptchaRef.current?.reset()
        onPlayerAdded(trimmedId)
        
        if (data.verified) {
          // Update player data with verification info
          setPlayerData(prev => ({
            ...prev,
            [trimmedId]: {
              id: trimmedId,
              verified: true,
              verificationData: data.verificationData
            }
          }))
          
          showToast(`Player ${trimmedId} verified and added successfully`, 'success')
        } else {
          showToast(`Added player: ${trimmedId}`, 'success')
        }
      } else {
        const errorMsg = data.message || data.error || 'Failed to add player'
        showToast(errorMsg, 'error')
        addRecaptchaRef.current?.reset()
      }
    } catch (error) {
      console.error('Error adding player:', error)
      showToast('Error adding player. Check console for details.', 'error')
      addRecaptchaRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const handleClaimForSelf = async (playerId) => {
    const recaptchaRef = claimRecaptchaRefs.current[playerId]
    const recaptchaToken = recaptchaRef?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      addActivity('Please complete the reCAPTCHA verification', 'error')
      return
    }
    
    setClaimingPlayerId(playerId)
    
    try {
      const response = await fetch(`${API_BASE}/claim-for-self`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, recaptchaToken })
      })
      
      const data = await response.json()
      
      if (data.success) {
        addActivity(`Claimed ${data.codesClaimed?.length || 0} code(s) for ${playerId}`, 'success')
        if (onCodeClaimed) {
          onCodeClaimed()
        }
        recaptchaRef?.reset()
      } else {
        addActivity(data.error || 'Failed to claim codes', 'error')
        recaptchaRef?.reset()
      }
    } catch (error) {
      addActivity('Error claiming codes', 'error')
      recaptchaRef?.reset()
    } finally {
      setClaimingPlayerId(null)
    }
  }

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm(`Remove player ${playerId}?`)) return
    
    const recaptchaRef = removeRecaptchaRefs.current[playerId]
    const recaptchaToken = recaptchaRef?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    // Only require reCAPTCHA if site key is configured
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      addActivity('Please complete the reCAPTCHA verification', 'error')
      return
    }
    
    try {
      const response = await fetch(`${API_BASE}/remove-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, recaptchaToken })
      })
      
      const data = await response.json()
      
      if (data.success) {
        onPlayerRemoved(playerId)
        addActivity(`Removed player: ${playerId}`, 'success')
        recaptchaRef?.reset()
        delete removeRecaptchaRefs.current[playerId]
        delete claimRecaptchaRefs.current[playerId]
      } else {
        addActivity(data.error || 'Failed to remove player', 'error')
        recaptchaRef?.reset()
      }
    } catch (error) {
      addActivity('Error removing player', 'error')
      recaptchaRef?.reset()
    }
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Player ID Management</h2>
        {activePlayerId && (
          <button
            onClick={onDetachPlayer}
            className="btn btn-danger btn-small"
            style={{ fontSize: '0.85rem' }}
          >
            Detach Player ID
          </button>
        )}
      </div>
      
      <form onSubmit={handleAddPlayer} className="add-player-form">
        <div className="input-row">
          <input
            type="text"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter Player ID (8-10 digits)"
            maxLength="10"
            pattern="[0-9]{8,10}"
            disabled={loading}
            className="input-field"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Adding...' : 'Add Player'}
          </button>
        </div>
        
        {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
         import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && (
          <div className="recaptcha-container">
            <ReCAPTCHA
              ref={addRecaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              theme="dark"
              size="compact"
            />
          </div>
        )}
      </form>

      {players.length > 0 && (
        <div className="player-list-container">
          <h3 style={{ color: 'var(--text-secondary)', margin: '1.25rem 0 0.625rem 0', fontSize: 'clamp(1rem, 2.5vw, 1.1rem)' }}>
            Active Players ({players.length})
          </h3>
          <div className="player-list">
            {players.map((id) => {
              const player = playerData[id] || { id, verified: false }
              return (
                <div key={id} className="player-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <span className="player-id">
                      {id}
                      {player.verified && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--success)', fontSize: '0.9em' }}>
                          ✓ Verified
                        </span>
                      )}
                    </span>
                    {player.verificationData && (
                      <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)' }}>
                        {player.verificationData.player_name || player.verificationData.name || 'Player verified'}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
                       import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && (
                        <ReCAPTCHA
                          ref={(ref) => {
                            if (ref) claimRecaptchaRefs.current[id] = ref
                          }}
                          sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                          theme="dark"
                          size="compact"
                        />
                      )}
                      <button
                        onClick={() => handleClaimForSelf(id)}
                        className="btn btn-success btn-small"
                        disabled={claimingPlayerId === id}
                      >
                        {claimingPlayerId === id ? 'Claiming...' : 'Claim Codes'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
                       import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && (
                        <ReCAPTCHA
                          ref={(ref) => {
                            if (ref) removeRecaptchaRefs.current[id] = ref
                          }}
                          sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                          theme="dark"
                          size="compact"
                        />
                      )}
                      <button
                        onClick={() => handleRemovePlayer(id)}
                        className="btn btn-danger btn-small"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerManagement
