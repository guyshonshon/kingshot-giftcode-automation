import React, { useState, useEffect, useRef } from 'react'
import '../App.css'

function VerificationModal({ isOpen, onClose, onConfirm, title = 'Enter Verification Code', message }) {
  const [code, setCode] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setCode('')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code && /^\d{6}$/.test(code)) {
      onConfirm(code)
      setCode('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {message && (
          <div className="modal-message">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="verification-code">6-Digit Verification Code</label>
            <input
              id="verification-code"
              ref={inputRef}
              type="text"
              className="input-field"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(value)
              }}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              maxLength="6"
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!code || !/^\d{6}$/.test(code)}
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VerificationModal

