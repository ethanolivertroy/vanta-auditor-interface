import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { themes, applyTheme, getStoredTheme } from '../themes'

function Settings() {
  const navigate = useNavigate()
  const [credentialSource, setCredentialSource] = useState('unknown')
  const [showConfirm, setShowConfirm] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme())

  useEffect(() => {
    // Check where credentials are coming from
    const storedCredentials = localStorage.getItem('vanta_credentials')
    if (storedCredentials) {
      setCredentialSource('browser')
    } else {
      // Check if backend has env credentials
      fetch('/api/test-token')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCredentialSource('server')
          }
        })
        .catch(() => {
          setCredentialSource('none')
        })
    }
  }, [])

  const handleLogout = () => {
    // Clear stored credentials
    localStorage.removeItem('vanta_credentials')
    // Set logout flag to prevent auto-login from server credentials
    localStorage.setItem('vanta_logged_out', 'true')
    
    // Reload the app to show credential setup
    window.location.href = '/'
  }

  const handleChangeCredentials = () => {
    // Clear stored credentials and set logout flag
    localStorage.removeItem('vanta_credentials')
    localStorage.setItem('vanta_logged_out', 'true')
    
    // Reload to show credential setup
    window.location.href = '/'
  }

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName)
    applyTheme(themeName)
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        <button onClick={() => navigate('/')} className="close-settings">×</button>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h3>Credentials</h3>
          <div className="credential-info">
            <p>
              <strong>Credential Source:</strong>{' '}
              {credentialSource === 'browser' && 'Stored in browser'}
              {credentialSource === 'server' && 'Server environment variables'}
              {credentialSource === 'unknown' && 'Checking...'}
              {credentialSource === 'none' && 'No credentials found'}
            </p>
            
            {credentialSource === 'browser' && (
              <div className="credential-actions">
                <p className="info-text">
                  Your Vanta credentials are stored locally in your browser. 
                  They are not sent to any external servers.
                </p>
                <button 
                  onClick={() => setShowConfirm(true)} 
                  className="logout-button"
                >
                  Clear Credentials & Logout
                </button>
              </div>
            )}

            {credentialSource === 'server' && (
              <div className="credential-actions">
                <p className="info-text">
                  Using credentials from server environment variables. 
                  To use different credentials, you can override them.
                </p>
                <button 
                  onClick={handleChangeCredentials} 
                  className="change-credentials-button"
                >
                  Use Different Credentials
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h3>Theme</h3>
          <p className="info-text">Choose your preferred Catppuccin color scheme</p>
          <div className="theme-selector">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                onClick={() => handleThemeChange(key)}
                style={{
                  background: theme.colors.surface0,
                  borderColor: theme.colors.mauve,
                  color: theme.colors.text
                }}
              >
                <span className="theme-preview">
                  <span style={{ background: theme.colors.red }}></span>
                  <span style={{ background: theme.colors.peach }}></span>
                  <span style={{ background: theme.colors.green }}></span>
                  <span style={{ background: theme.colors.blue }}></span>
                  <span style={{ background: theme.colors.mauve }}></span>
                </span>
                <span className="theme-name">{theme.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="about-text">
            Vanta Auditor Interface - An enhanced interface for auditors using Vanta
            featuring dark mode, in-app document viewing, and bulk operations.
          </p>
          <p className="version-text">Version 1.0.0</p>
          <p className="attribution">
            Made with 🧪👽 by <a href="https://github.com/ethanolivertroy" target="_blank" rel="noopener noreferrer">ET</a>
          </p>
        </section>
      </div>

      {showConfirm && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>Clear Credentials?</h3>
            <p>This will remove your stored Vanta credentials and return you to the setup screen.</p>
            <div className="confirm-buttons">
              <button onClick={handleLogout} className="confirm-yes">
                Yes, Clear & Logout
              </button>
              <button onClick={() => setShowConfirm(false)} className="confirm-no">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings