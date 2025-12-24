import React, { useState, useEffect } from 'react'
import '../App.css'

function MessageBanner({ totalGiftsRedeemed, hasPlayerId }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const getMessages = () => {
    const messages = [
      "Lord freedom is Pay to Win",
      `Did you know? A total of ${totalGiftsRedeemed} gifts has been redeemed automagically so far!`
    ]
    
    if (!hasPlayerId) {
      messages.push("Add your Player ID to start claiming gift codes automatically!")
    }
    
    return messages
  }

  useEffect(() => {
    const messages = getMessages()
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      
      // After fade out, change message and fade in
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length)
        setIsVisible(true)
      }, 500) // Half of transition duration
    }, 5000) // Change message every 5 seconds

    return () => clearInterval(interval)
  }, [totalGiftsRedeemed])

  const messages = getMessages()

  return (
    <div className="message-banner">
      <div className={`message-banner-content ${isVisible ? 'visible' : 'hidden'}`}>
        {messages[currentIndex]}
      </div>
    </div>
  )
}

export default MessageBanner

