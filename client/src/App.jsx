import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import AuditList from './components/AuditList'
import AuditDetail from './components/AuditDetail'
import CredentialSetup from './components/CredentialSetup'
import Settings from './components/Settings'
import { config } from './config'
import { applyTheme, getStoredTheme } from './themes'
import './App.css'

function App() {
  const [hasCredentials, setHasCredentials] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Apply stored theme on app load
    applyTheme(getStoredTheme())
    checkCredentials()
  }, [])

  const checkCredentials = async () => {
    try {
      // First check if user has explicitly logged out
      const hasLoggedOut = localStorage.getItem('vanta_logged_out') === 'true'
      
      // Check if credentials exist in localStorage
      const storedCredentials = localStorage.getItem('vanta_credentials')
      if (storedCredentials) {
        setHasCredentials(true)
        setLoading(false)
        return
      }

      // If user hasn't logged out, check if backend has env credentials
      if (!hasLoggedOut) {
        const response = await fetch('/api/test-token')
        const data = await response.json()
        
        if (data.success) {
          setHasCredentials(true)
        }
      }
    } catch (error) {
      console.log('No backend credentials found')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!hasCredentials) {
    return <CredentialSetup onComplete={() => setHasCredentials(true)} />
  }

  return (
    <Router>
      <div className="App">
        <header>
          <div className="header-content">
            <div className="logo-section">
              {config.logo && <img src={config.logo} alt="Logo" className="logo" />}
              <h1>{config.appName}</h1>
            </div>
            <nav>
              <Link to="/">Home</Link>
              <Link to="/settings">Settings</Link>
            </nav>
          </div>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<AuditList />} />
            <Route path="/audit/:auditId" element={<AuditDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
