import React, { useState, useEffect, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import '../App.css'

const API_BASE = '/.netlify/functions'

function ActivityLog({ activities, players, onCodeClaimed }) {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimingCodes, setClaimingCodes] = useState({})
  const recaptchaRefs = useRef({})

  useEffect(() => {
    loadCodes()
    // Refresh every 30 seconds
    const interval = setInterval(loadCodes, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadCodes = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-codes-with-claims`)
      const data = await response.json()
      if (data.success) {
        setCodes(data.codes || [])
      }
    } catch (error) {
      console.error('Error loading codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimCode = async (giftCode, playerId) => {
    const recaptchaRef = recaptchaRefs.current[`${playerId}-${giftCode}`]
    const recaptchaToken = recaptchaRef?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      alert('Please complete the reCAPTCHA verification')
      return
    }

    setClaimingCodes(prev => ({ ...prev, [`${playerId}-${giftCode}`]: true }))

    try {
      const response = await fetch(`${API_BASE}/claim-single-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, giftCode, recaptchaToken })
      })

      const data = await response.json()

      if (data.success) {
        if (data.alreadyClaimed) {
          alert(`Code ${giftCode} was already claimed for this player`)
        } else {
          alert(`Successfully claimed code ${giftCode}`)
          if (onCodeClaimed) {
            onCodeClaimed()
          }
        }
        loadCodes() // Refresh the list
        recaptchaRef?.reset()
      } else {
        alert(data.error || 'Failed to claim code')
        recaptchaRef?.reset()
      }
    } catch (error) {
      alert('Error claiming code')
      recaptchaRef?.reset()
    } finally {
      setClaimingCodes(prev => {
        const newState = { ...prev }
        delete newState[`${playerId}-${giftCode}`]
        return newState
      })
    }
  }

  const isCodeClaimedByPlayer = (code, playerId) => {
    return code.players && code.players.includes(playerId)
  }

  return (
    <div className="section">
      <h2 className="section-title">Active Codes</h2>
      <div className="activity-log">
        {loading ? (
          <div className="empty-state">Loading codes...</div>
        ) : codes.length === 0 ? (
          <div className="empty-state">No active codes found</div>
        ) : (
          codes.map((codeData, index) => (
            <div key={index} className="activity-item success">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <strong style={{ color: 'var(--accent-color)', fontSize: '1.2em', display: 'block', marginBottom: '0.5rem' }}>
                    {codeData.code}
                  </strong>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                    {codeData.claimCount} player(s) claimed
                  </div>
                  {codeData.players && codeData.players.length > 0 && (
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Players: {codeData.players.join(', ')}
                    </div>
                  )}
                  {codeData.timestamp && (
                    <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Last claimed: {new Date(codeData.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                {players.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    {players.map(playerId => {
                      const isClaimed = isCodeClaimedByPlayer(codeData, playerId)
                      const claimKey = `${playerId}-${codeData.code}`
                      const isClaiming = claimingCodes[claimKey]
                      
                      return (
                        <div key={playerId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                          {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
                           import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && (
                            <ReCAPTCHA
                              ref={(ref) => {
                                if (ref) recaptchaRefs.current[claimKey] = ref
                              }}
                              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                              theme="dark"
                              size="compact"
                            />
                          )}
                          <button
                            onClick={() => handleClaimCode(codeData.code, playerId)}
                            disabled={isClaiming || isClaimed}
                            className={`btn btn-small ${isClaimed ? 'btn-success' : 'btn-primary'}`}
                            style={{ minWidth: '120px' }}
                          >
                            {isClaiming ? 'Claiming...' : isClaimed ? '✓ Claimed' : `Claim (${playerId.slice(-4)})`}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ActivityLog
