import React from 'react'
import GiftIcon from './GiftIcon'
import '../App.css'

function TermsOfService({ onBack }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-icon">
          <GiftIcon size={48} />
        </div>
        <h1>Terms of Service</h1>
      </header>

      <main className="main-content">
        <div className="section">
          <div className="tos-content">
            <h2>1. Introduction</h2>
            <p>
              This tool is a non-profit project created for educational purposes only. It performs automatic 
              claiming of gift codes for Kingshot players using official Kingshot's claiming protocols. 
              This service is provided "as is" without any warranties or guarantees.
            </p>

            <h2>2. Non-Affiliation Disclaimer</h2>
            <p>
              <strong>This tool is NOT affiliated with, endorsed by, or in any way connected to:</strong>
            </p>
            <ul>
              <li>Kingshot game or its developers</li>
              <li>Century Games or any associated entities</li>
              <li>Any official Kingshot service providers</li>
            </ul>
            <p>
              You can redeem gift codes directly via the official Kingshot gift code redemption site at:{' '}
              <a href="https://ks-giftcode.centurygame.com/" target="_blank" rel="noopener noreferrer">
                https://ks-giftcode.centurygame.com/
              </a>
            </p>

            <h2>3. Educational and Non-Profit Purpose</h2>
            <p>
              This tool is created solely for educational purposes to demonstrate automation concepts and 
              API interaction patterns. It is a non-profit project with no commercial intent. The tool is 
              provided free of charge to help users automate gift code redemption processes.
            </p>

            <h2>4. Data Collection and Privacy</h2>
            <p>
              <strong>By submitting your Player ID and/or redeeming gift codes, and by visiting this website, 
              you acknowledge that your actions and data may be recorded and stored on our end, including but 
              not limited to:</strong>
            </p>
            <ul>
              <li>Your IP address</li>
              <li>Player ID</li>
              <li>Gift codes redeemed</li>
              <li>Timestamps of actions</li>
              <li>Usage patterns and analytics data</li>
              <li>Other usage information</li>
            </ul>
            <p>
              This data may be used for:
            </p>
            <ul>
              <li>Service operation and functionality</li>
              <li>Security and fraud prevention</li>
              <li>Analytics and service improvement</li>
              <li>Debugging and troubleshooting</li>
            </ul>
            <p>
              We do not sell or share your data with third parties. However, data is stored in ephemeral 
              storage systems and may be subject to data retention policies.
            </p>

            <h2>5. Legal Liability and Disclaimer</h2>
            <p>
              <strong>IMPORTANT LEGAL NOTICE:</strong>
            </p>
            <ul>
              <li>
                <strong>No Warranty:</strong> This service is provided "as is" without any warranties, 
                express or implied, including but not limited to warranties of merchantability, fitness 
                for a particular purpose, or non-infringement.
              </li>
              <li>
                <strong>User Responsibility:</strong> Users assume all liability and risk associated with 
                using this tool. You are solely responsible for any consequences arising from your use of 
                this service.
              </li>
              <li>
                <strong>No Liability:</strong> The creators, operators, and maintainers of this tool are 
                not responsible for any damages, losses, legal issues, account suspensions, or any other 
                consequences that may arise from the use of this service.
              </li>
              <li>
                <strong>Use at Your Own Risk:</strong> This tool should be used at your own discretion and 
                risk. We hereby disclaim all liability for any damages, losses, or legal issues that may 
                arise from the use of this tool.
              </li>
              <li>
                <strong>No Legal Relationship:</strong> Use of this service does not create any legal 
                relationship, partnership, or agency between you and the service providers.
              </li>
            </ul>

            <h2>6. Account and Service Risks</h2>
            <p>
              Using automated tools may violate the terms of service of Kingshot or Century Games. 
              We are not responsible for:
            </p>
            <ul>
              <li>Account suspensions or bans</li>
              <li>Loss of game progress or items</li>
              <li>Any actions taken by game developers against your account</li>
              <li>Service interruptions or failures</li>
            </ul>

            <h2>7. Service Availability</h2>
            <p>
              This service may be unavailable at any time due to maintenance, updates, or technical issues. 
              We do not guarantee continuous availability or functionality of the service.
            </p>

            <h2>8. Contact Information</h2>
            <p>
              For any issues, questions, or concerns regarding this service, please contact:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:dharokist@gmail.com">dharokist@gmail.com</a>
            </p>

            <h2>9. Acceptance of Terms</h2>
            <p>
              By using this service, you acknowledge that you have read, understood, and agree to be bound 
              by these Terms of Service. If you do not agree to these terms, you must not use this service.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service after 
              changes constitutes acceptance of the modified terms.
            </p>

            <div className="tos-footer">
              <p>
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p>
                © {new Date().getFullYear()} Matry Dminit. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={onBack} className="btn btn-primary">
            Back to Home
          </button>
        </div>
      </main>
    </div>
  )
}

export default TermsOfService

