import React, { useState, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import '../App.css'

const API_BASE = '/.netlify/functions'

function GiftCodeRedemption({ players, onRedeemComplete, addActivity }) {
  const [giftCode, setGiftCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ message: '', type: '' })
  const recaptchaRef = useRef(null)

  const handleRedeem = async (e) => {
    e.preventDefault()
    
    const trimmedCode = giftCode.trim()
    const trimmedVerification = verificationCode.trim()
    
    if (!trimmedCode) {
      setStatus({ message: 'Please enter a gift code', type: 'error' })
      return
    }
    
    if (!trimmedVerification || !/^\d{4}$/.test(trimmedVerification)) {
      setStatus({ message: 'Please enter a valid 4-digit verification code', type: 'error' })
      return
    }
    
    if (players.length === 0) {
      setStatus({ message: 'No players in the list', type: 'error' })
      return
    }
    
    const recaptchaToken = recaptchaRef.current?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    // Only require reCAPTCHA if site key is configured
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      setStatus({ message: 'Please complete the reCAPTCHA verification', type: 'error' })
      return
    }
    
    if (!window.confirm(`Redeem gift code "${trimmedCode}" for ${players.length} player(s)?`)) {
      return
    }
    
    setLoading(true)
    setStatus({ message: 'Processing...', type: 'info' })
    
    try {
      const response = await fetch(`${API_BASE}/redeem-giftcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          giftCode: trimmedCode, 
          verificationCode: trimmedVerification,
          recaptchaToken,
          players 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGiftCode('')
        setVerificationCode('')
        recaptchaRef.current?.reset()
        setStatus({
          message: `Redeemed for ${data.successCount || 0} player(s). ${data.failCount || 0} failed.`,
          type: data.failCount > 0 ? 'warning' : 'success'
        })
        onRedeemComplete({
          giftCode: trimmedCode,
          successCount: data.successCount || 0,
          failCount: data.failCount || 0
        })
      } else {
        setStatus({ message: data.error || 'Failed to redeem gift code', type: 'error' })
        addActivity(`Failed to redeem "${trimmedCode}"`, 'error')
        recaptchaRef.current?.reset()
      }
    } catch (error) {
      setStatus({ message: 'Error redeeming gift code', type: 'error' })
      addActivity('Error redeeming gift code', 'error')
      recaptchaRef.current?.reset()
    } finally {
      setLoading(false)
      setTimeout(() => {
        setStatus({ message: '', type: '' })
      }, 5000)
    }
  }

  return (
    <div className="section">
      <h2 className="section-title">Gift Code Redemption</h2>
      
      <form onSubmit={handleRedeem}>
        <div className="input-group">
          <input
            type="text"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
            placeholder="Enter Gift Code"
            maxLength="20"
            disabled={loading}
            className="input-field"
          />
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4-Digit Code"
            maxLength="4"
            disabled={loading}
            className="input-field"
            style={{ maxWidth: '150px' }}
          />
        </div>
        
        {import.meta.env.VITE_RECAPTCHA_SITE_KEY && 
         import.meta.env.VITE_RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && (
          <div className="recaptcha-container">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              theme="dark"
            />
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || players.length === 0}
          className="btn btn-success"
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? 'Redeeming...' : 'Redeem for All Players'}
        </button>
      </form>

      {status.message && (
        <div className={`status-info status-${status.type}`} style={{ marginTop: '1rem' }}>
          {status.message}
        </div>
      )}
    </div>
  )
}

export default GiftCodeRedemption
