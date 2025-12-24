import React, { useState, useEffect, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import VerificationModal from './VerificationModal'
import '../App.css'
import { API_BASE } from '../config'

function ActivityLog({ activities, players, activePlayerId, showToast, onCodeClaimed }) {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimingCodes, setClaimingCodes] = useState({})
  const [verificationModal, setVerificationModal] = useState({ isOpen: false, giftCode: null })
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
      if (!response.ok) {
        throw new Error('Failed to fetch')
      }
      const data = await response.json()
      if (data.success) {
        // Combine active and expired codes, with expired at the end
        const allCodes = [
          ...(data.activeCodes || []),
          ...(data.expiredCodes || [])
        ]
        console.log('Loaded codes:', { active: data.activeCodes?.length || 0, expired: data.expiredCodes?.length || 0, total: allCodes.length })
        setCodes(allCodes)
      } else {
        console.error('Failed to load codes:', data)
      }
    } catch (error) {
      // Silently fail - functions may not be available in dev
      console.error('Error loading codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimCode = async (giftCode, playerId) => {
    if (!activePlayerId) {
      showToast('Please add a Player ID first', 'error')
      return
    }

    // No verification code required for single player claims

    const recaptchaRef = recaptchaRefs.current[`${playerId}-${giftCode}`]
    const recaptchaToken = recaptchaRef?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      showToast('Please complete the reCAPTCHA verification', 'error')
      return
    }

    setClaimingCodes(prev => ({ ...prev, [`${playerId}-${giftCode}`]: true }))

    try {
      const response = await fetch(`${API_BASE}/claim-single-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: String(playerId).trim(), 
          giftCode, 
          recaptchaToken 
        })
      })

      const data = await response.json()
      
      // Log debug info if available
      if (data.debug) {
        console.log('Claim debug info:', data.debug)
      }

      if (data.success) {
        if (data.alreadyClaimed) {
          showToast(`Code ${giftCode} was already claimed`, 'info')
        } else {
          showToast(`Successfully claimed code ${giftCode}`, 'success')
          if (onCodeClaimed) {
            onCodeClaimed()
          }
        }
        loadCodes() // Refresh the list
        recaptchaRef?.reset()
      } else {
        showToast(data.error || 'Failed to claim code', 'error')
        recaptchaRef?.reset()
      }
    } catch (error) {
      showToast('Error claiming code', 'error')
      recaptchaRef?.reset()
    } finally {
      setClaimingCodes(prev => {
        const newState = { ...prev }
        delete newState[`${playerId}-${giftCode}`]
        return newState
      })
    }
  }

  const handleClaimForAllClick = (giftCode) => {
    if (!activePlayerId) {
      showToast('Please add a Player ID first', 'error')
      return
    }

    if (players.length === 0) {
      showToast('No players in the list', 'error')
      return
    }

    // Open verification modal
    setVerificationModal({ isOpen: true, giftCode })
  }

  const handleClaimForAll = async (giftCode, verificationCode) => {
    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      showToast('Invalid verification code. Must be 6 digits.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/redeem-giftcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          giftCode, 
          verificationCode,
          players 
        })
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Redeemed for ${data.successCount || 0} player(s). ${data.failCount || 0} failed.`, data.failCount > 0 ? 'warning' : 'success')
        if (onCodeClaimed) {
          onCodeClaimed()
        }
        loadCodes()
      } else {
        showToast(data.error || 'Failed to redeem gift code', 'error')
      }
    } catch (error) {
      showToast('Error redeeming gift code', 'error')
    }
  }

  const isCodeClaimedByPlayer = (code, playerId) => {
    return code.players && code.players.includes(playerId)
  }

  const handleCopyCode = async (code) => {
    try {
      // Use modern Clipboard API (cross-platform)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
        showToast(`Code "${code}" copied to clipboard!`, 'success', 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        showToast(`Code "${code}" copied to clipboard!`, 'success', 2000)
      }
    } catch (error) {
      console.error('Failed to copy code:', error)
      showToast('Failed to copy code to clipboard', 'error')
    }
  }

  const activeCodes = codes.filter(c => !c.isExpired).sort((a, b) => {
    // Sort by expiration date (earliest first)
    if (!a.expirationDate && !b.expirationDate) return 0
    if (!a.expirationDate) return 1
    if (!b.expirationDate) return -1
    return new Date(a.expirationDate) - new Date(b.expirationDate)
  })
  
  const expiredCodes = codes.filter(c => c.isExpired)

  return (
    <div className="section">
      <h2 className="section-title">Active Codes</h2>
      <div className="codes-grid">
        {loading ? (
          <div className="empty-state">Loading codes...</div>
        ) : activeCodes.length === 0 ? (
          <div className="empty-state">No active codes found</div>
        ) : (
          activeCodes.map((codeData, index) => (
            <div key={`active-${index}`} className="code-card">
              <div className="code-header">
                <strong 
                  className="code-text code-text-clickable" 
                  onClick={() => handleCopyCode(codeData.code)}
                  title="Click to copy code"
                >
                  {codeData.code}
                </strong>
                <div className="code-meta">
                  {codeData.claimCount} claim{codeData.claimCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {codeData.players && codeData.players.length > 0 && (
                <div className="code-players">
                  <small>Players: {codeData.players.join(', ')}</small>
                </div>
              )}

              {codeData.expiration && (
                <div className="code-expiration">
                  <small>⏰ Expires: {codeData.expiration}</small>
                </div>
              )}
              {!codeData.expiration && (
                <div className="code-expiration" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                  <small>No expiration date</small>
                </div>
              )}

              <div className="code-actions">
                {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
                 import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && activePlayerId && (
                  <ReCAPTCHA
                    ref={(ref) => {
                      if (ref) recaptchaRefs.current[`${activePlayerId}-${codeData.code}`] = ref
                    }}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    theme="dark"
                    size="compact"
                  />
                )}
                <button
                  onClick={() => activePlayerId && handleClaimCode(codeData.code, activePlayerId)}
                  disabled={!activePlayerId || claimingCodes[`${activePlayerId}-${codeData.code}`] || isCodeClaimedByPlayer(codeData, activePlayerId)}
                  className={`btn btn-small ${!activePlayerId ? 'btn-disabled' : isCodeClaimedByPlayer(codeData, activePlayerId) ? 'btn-success' : 'btn-primary'}`}
                  title={!activePlayerId ? 'Add a Player ID to claim codes' : ''}
                >
                  {!activePlayerId ? 'Claim (Login Required)' : claimingCodes[`${activePlayerId}-${codeData.code}`] ? 'Claiming...' : isCodeClaimedByPlayer(codeData, activePlayerId) ? '✓ Claimed' : 'Claim'}
                </button>
                {players.length > 0 && (
                  <button
                    onClick={() => handleClaimForAllClick(codeData.code)}
                    className="btn btn-small btn-success"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Claim for All
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Expired Codes Section - Separate Container */}
      {expiredCodes.length > 0 && (
        <div className="expired-codes-section">
          <h2 className="section-title">Expired Codes</h2>
          <div className="expired-codes-grid">
            {expiredCodes.map((codeData, index) => (
              <div key={`expired-${index}`} className="expired-code-card">
                <div className="expired-code-header">
                  <div className="expired-code-name">{codeData.code}</div>
                  <div className="expired-code-meta">
                    {codeData.claimCount} claim{codeData.claimCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {codeData.expiration && (
                  <div className="expired-code-date">
                    <small>Expired: {codeData.expiration}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Modal */}
      <VerificationModal
        isOpen={verificationModal.isOpen}
        onClose={() => setVerificationModal({ isOpen: false, giftCode: null })}
        onConfirm={(verificationCode) => {
          setVerificationModal({ isOpen: false, giftCode: null })
          handleClaimForAll(verificationModal.giftCode, verificationCode)
        }}
        title="Claim for All Players"
        message={`Enter the 6-digit verification code to claim "${verificationModal.giftCode}" for all ${players.length} player(s).`}
      />
    </div>
  )
}

export default ActivityLog
