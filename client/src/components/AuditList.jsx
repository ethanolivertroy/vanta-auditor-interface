import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

function AuditList() {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageInfo, setPageInfo] = useState(null)

  useEffect(() => {
    fetchAudits()
  }, [])

  const fetchAudits = async (pageCursor = null) => {
    try {
      setLoading(true)
      const params = { pageSize: 20 }
      if (pageCursor) params.pageCursor = pageCursor
      
      const response = await api.get('/api/audits', { params })
      console.log('Frontend received:', response.data)
      
      // Handle the nested structure from Vanta API
      const responseData = response.data.results || response.data
      const auditsData = responseData.data || []
      const pageData = responseData.pageInfo || null
      
      setAudits(auditsData)
      setPageInfo(pageData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch audits')
      console.error('Frontend error:', err)
      console.error('Response:', err.response)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading audits...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="audit-list">
      <h2>Customer Audits</h2>
      
      {audits.length === 0 ? (
        <p>No audits found</p>
      ) : (
        <div className="audits-grid">
          {audits.map(audit => (
            <div key={audit.id} className="audit-card">
              <h3>{audit.customerDisplayName}</h3>
              <p className="framework">{audit.framework}</p>
              <p>Organization: {audit.customerOrganizationName}</p>
              <p>Focus: {audit.auditFocus}</p>
              <p>Audit Period: {new Date(audit.auditStartDate).toLocaleDateString()} - {new Date(audit.auditEndDate).toLocaleDateString()}</p>
              <p>Created: {new Date(audit.creationDate).toLocaleDateString()}</p>
              <Link 
                to={`/audit/${audit.id}`} 
                state={{ audit }}
                className="view-details"
              >
                View Details →
              </Link>
            </div>
          ))}
        </div>
      )}
      
      {pageInfo && pageInfo.hasNextPage && (
        <button 
          onClick={() => fetchAudits(pageInfo.endCursor)}
          className="load-more"
        >
          Load More
        </button>
      )}
    </div>
  )
}

export default AuditList