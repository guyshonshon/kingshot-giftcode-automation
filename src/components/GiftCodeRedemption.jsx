import React, { useState, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import '../App.css'

const API_BASE = '/.netlify/functions'

function GiftCodeRedemption({ players, onRedeemComplete, addActivity, showToast }) {
  const [giftCode, setGiftCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef(null)

  const handleRedeem = async (e) => {
    e.preventDefault()
    
    const trimmedCode = giftCode.trim()
    const trimmedVerification = verificationCode.trim()
    
    if (!trimmedCode) {
      showToast('Please enter a gift code', 'error')
      return
    }
    
    if (!trimmedVerification || !/^\d{6}$/.test(trimmedVerification)) {
      showToast('Please enter a valid 6-digit verification code', 'error')
      return
    }
    
    if (players.length === 0) {
      showToast('No players in the list', 'error')
      return
    }
    
    const recaptchaToken = recaptchaRef.current?.getValue()
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    // Only require reCAPTCHA if site key is configured
    if (recaptchaSiteKey && recaptchaSiteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' && !recaptchaToken) {
      showToast('Please complete the reCAPTCHA verification', 'error')
      return
    }
    
    if (!window.confirm(`Redeem gift code "${trimmedCode}" for ${players.length} player(s)?`)) {
      return
    }
    
    setLoading(true)
    showToast('Processing...', 'info', 2000)
    
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
        showToast(
          `Redeemed for ${data.successCount || 0} player(s). ${data.failCount || 0} failed.`,
          data.failCount > 0 ? 'warning' : 'success'
        )
        onRedeemComplete({
          giftCode: trimmedCode,
          successCount: data.successCount || 0,
          failCount: data.failCount || 0
        })
      } else {
        showToast(data.error || 'Failed to redeem gift code', 'error')
        recaptchaRef.current?.reset()
      }
    } catch (error) {
      showToast('Error redeeming gift code', 'error')
      recaptchaRef.current?.reset()
    } finally {
      setLoading(false)
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
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-Digit Code"
            maxLength="6"
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

    </div>
  )
}

export default GiftCodeRedemption
