import { useState, useEffect } from 'react'
import axios from 'axios'

function CredentialSetup({ onComplete }) {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: ''
  })
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [hasServerCredentials, setHasServerCredentials] = useState(false)

  useEffect(() => {
    // Check if server has credentials
    axios.get('/api/test-token')
      .then(response => {
        if (response.data.success) {
          setHasServerCredentials(true)
        }
      })
      .catch(() => {
        // Server doesn't have credentials
      })
  }, [])

  const handleTest = async () => {
    if (!credentials.clientId || !credentials.clientSecret) {
      setError('Please provide both Client ID and Client Secret')
      return
    }

    setTesting(true)
    setError('')

    try {
      // Test the credentials by making a test API call
      const response = await axios.post('/api/test-credentials', credentials)
      
      if (response.data.success) {
        // Save credentials to localStorage (in production, consider encryption)
        localStorage.setItem('vanta_credentials', JSON.stringify(credentials))
        // Clear the logout flag
        localStorage.removeItem('vanta_logged_out')
        onComplete()
      } else {
        setError('Invalid credentials. Please check and try again.')
      }
    } catch (err) {
      console.error('Credential validation error:', err)
      const errorMessage = err.response?.data?.error || 'Failed to validate credentials. Please check and try again.'
      setError(errorMessage)
    } finally {
      setTesting(false)
    }
  }

  const handleUseServerCredentials = () => {
    // Clear the logout flag and use server credentials
    localStorage.removeItem('vanta_logged_out')
    onComplete()
  }

  return (
    <div className="credential-setup-container">
      <div className="credential-setup">
        <h2>Welcome to Vanta Auditor Interface</h2>
        <p>To get started, please enter your Vanta API credentials.</p>
        
        <div className="credential-form">
          <div className="form-group">
            <label htmlFor="clientId">Client ID</label>
            <input
              id="clientId"
              type="text"
              placeholder="vci_..."
              value={credentials.clientId}
              onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
              disabled={testing}
            />
            <small>Your Vanta OAuth Client ID</small>
          </div>

          <div className="form-group">
            <label htmlFor="clientSecret">Client Secret</label>
            <input
              id="clientSecret"
              type="password"
              placeholder="vcs_..."
              value={credentials.clientSecret}
              onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
              disabled={testing}
            />
            <small>Your Vanta OAuth Client Secret</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            onClick={handleTest} 
            disabled={testing || !credentials.clientId || !credentials.clientSecret}
            className="primary"
          >
            {testing ? 'Testing Connection...' : 'Connect to Vanta'}
          </button>

          {hasServerCredentials && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                — OR —
              </p>
              <button 
                onClick={handleUseServerCredentials}
                style={{
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Use Server Credentials
              </button>
            </div>
          )}
        </div>

        <div className="credential-help">
          <h3>How to get your credentials:</h3>
          <ol>
            <li>Log in to your Vanta account</li>
            <li>Navigate to Settings → Developer → API Tokens</li>
            <li>Create a new OAuth application</li>
            <li>Copy the Client ID and Client Secret</li>
          </ol>
          <p className="security-note">
            <strong>Security Note:</strong> Your credentials are stored locally in your browser 
            and are never sent to any external servers except Vanta's API.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CredentialSetup