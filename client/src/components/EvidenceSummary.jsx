import { useState, useEffect } from 'react'

function EvidenceSummary({ evidence }) {
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {},
    byType: {},
    testResults: { passing: 0, failing: 0, na: 0 }
  })

  useEffect(() => {
    if (evidence && evidence.length > 0) {
      const statusCounts = {}
      const typeCounts = {}
      let passingTests = 0
      let failingTests = 0
      let naTests = 0

      evidence.forEach(item => {
        // Count by status
        const status = item.status || 'Unknown'
        statusCounts[status] = (statusCounts[status] || 0) + 1

        // Count by type
        const type = item.evidenceType || 'Unknown'
        typeCounts[type] = (typeCounts[type] || 0) + 1

        // Count test results
        if (item.evidenceType === 'Test' && item.testStatus) {
          if (item.testStatus.includes('passing')) {
            passingTests++
          } else if (item.testStatus.includes('failing')) {
            failingTests++
          } else {
            naTests++
          }
        }
      })

      setSummary({
        total: evidence.length,
        byStatus: statusCounts,
        byType: typeCounts,
        testResults: { passing: passingTests, failing: failingTests, na: naTests }
      })
    }
  }, [evidence])

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': return 'var(--ctp-green)'
      case 'Ready for audit': return 'var(--ctp-sapphire)'
      case 'Flagged': return 'var(--ctp-peach)'
      case 'Rejected': return 'var(--ctp-red)'
      default: return 'var(--ctp-overlay1)'
    }
  }

  const getProgressPercentage = () => {
    if (summary.total === 0) return 0
    const accepted = summary.byStatus['Accepted'] || 0
    return Math.round((accepted / summary.total) * 100)
  }

  return (
    <div className="evidence-summary">
      <h3>Evidence Overview</h3>
      
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Total Evidence</h4>
          <div className="big-number">{summary.total}</div>
        </div>

        <div className="summary-card">
          <h4>Completion Progress</h4>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="progress-text">{getProgressPercentage()}% Accepted</div>
        </div>

        <div className="summary-card">
          <h4>Evidence by Status</h4>
          <div className="status-breakdown">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span 
                  className="status-dot" 
                  style={{ backgroundColor: getStatusColor(status) }}
                />
                <span className="status-label">{status}:</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-card">
          <h4>Evidence by Type</h4>
          <div className="type-breakdown">
            {Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="type-item">
                <span className="type-label">{type}:</span>
                <span className="type-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {summary.testResults.passing + summary.testResults.failing + summary.testResults.na > 0 && (
          <div className="summary-card">
            <h4>Test Results</h4>
            <div className="test-results">
              <div className="test-item passing">
                <span>Passing:</span>
                <span>{summary.testResults.passing}</span>
              </div>
              <div className="test-item failing">
                <span>Failing:</span>
                <span>{summary.testResults.failing}</span>
              </div>
              <div className="test-item na">
                <span>N/A:</span>
                <span>{summary.testResults.na}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EvidenceSummary