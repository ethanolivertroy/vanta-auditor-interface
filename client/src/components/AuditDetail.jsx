import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import api from '../utils/api'
import EvidenceSummary from './EvidenceSummary'

// Document Viewer with Selector Component
function DocumentViewerWithSelector({ url, name, initialType }) {
  const [viewMode, setViewMode] = useState(initialType === 'application/json' ? 'json' : 'pdf')
  
  return (
    <div className="document-viewer-container">
      <div className="view-selector">
        <label>View as: </label>
        <select 
          value={viewMode} 
          onChange={(e) => setViewMode(e.target.value)}
          style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '0.25rem 0.5rem',
            marginLeft: '0.5rem'
          }}
        >
          <option value="pdf">PDF</option>
          <option value="json">JSON</option>
        </select>
      </div>
      
      <div style={{ marginTop: '1rem' }}>
        {viewMode === 'pdf' ? (
          <PdfViewer url={url} name={name} />
        ) : (
          <JsonViewer url={url} name={name} />
        )}
      </div>
    </div>
  )
}

// Document Type Detector Component
function DocumentTypeDetector({ url, name }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detectedType, setDetectedType] = useState(null)

  useEffect(() => {
    const detectType = async () => {
      try {
        setLoading(true)
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const contentType = response.headers.get('content-type')
        const text = await response.text()
        
        // Detect based on content
        if (text.startsWith('%PDF')) {
          setDetectedType('pdf')
        } else if (text.startsWith('{') || text.startsWith('[')) {
          try {
            const parsed = JSON.parse(text)
            setDetectedType('json')
            setContent(parsed)
          } catch {
            setDetectedType('text')
            setContent(text)
          }
        } else {
          setDetectedType('text')
          setContent(text)
        }
        
        setError(null)
      } catch (err) {
        console.error('Error detecting document type:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    detectType()
  }, [url])

  if (loading) return <div className="loading">Loading document...</div>
  if (error) return <div className="error">Error loading document: {error}</div>

  // Render based on detected type
  if (detectedType === 'pdf') {
    return <PdfViewer url={url} name={name} />
  } else if (detectedType === 'json') {
    return (
      <div className="json-viewer">
        <pre style={{
          background: 'var(--surface)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'auto',
          maxHeight: '500px',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'var(--text-primary)'
        }}>
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    )
  } else {
    return (
      <div className="text-viewer">
        <pre style={{
          background: 'var(--surface)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'auto',
          maxHeight: '500px',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {content}
        </pre>
      </div>
    )
  }
}

// PDF Viewer Component
function PdfViewer({ url, name }) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true)
        // First try to load the PDF as a blob to check if it's accessible
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
        setError(null)
      } catch (err) {
        console.error('Error loading PDF:', err)
        // If direct fetch fails, use Google Docs viewer as fallback
        setPdfUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
    
    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [url])

  if (loading) return <div className="loading">Loading PDF...</div>
  if (error) return <div className="error">Error loading PDF: {error}</div>

  return (
    <div className="pdf-viewer">
      <iframe 
        src={pdfUrl} 
        className="document-preview"
        title={name}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--surface)'
        }}
      />
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
        If the PDF doesn't display properly, <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>open it in a new tab</a>
      </p>
    </div>
  )
}

// JSON Viewer Component
function JsonViewer({ url, name }) {
  const [jsonData, setJsonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchJson = async () => {
      try {
        setLoading(true)
        // Use the proxy endpoint to avoid CORS issues
        const proxyUrl = `/api/proxy/document?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const contentType = response.headers.get('content-type')
        let data
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // Try to parse as JSON anyway
          const text = await response.text()
          
          // Check if it's actually a PDF
          if (text.startsWith('%PDF')) {
            throw new Error('This is a PDF file, not JSON')
          }
          
          try {
            data = JSON.parse(text)
          } catch {
            // If not JSON, display as text
            data = { _raw: text }
          }
        }
        
        setJsonData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching JSON:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchJson()
  }, [url])

  if (loading) return <div className="loading">Loading document...</div>
  if (error) return <div className="error">Error loading document: {error}</div>

  return (
    <div className="json-viewer">
      <pre style={{
        background: 'var(--surface)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        overflow: 'auto',
        maxHeight: '500px',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        color: 'var(--text-primary)'
      }}>
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    </div>
  )
}

function AuditDetail() {
  const { auditId } = useParams()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('evidence')
  const [evidence, setEvidence] = useState([])
  const [controls, setControls] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [audit, setAudit] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState([])
  const [bulkState, setBulkState] = useState('')
  const [documentModal, setDocumentModal] = useState(null)
  const [evidenceUrls, setEvidenceUrls] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (location.state?.audit) {
      setAudit(location.state.audit)
    }
    fetchAuditDetails()
  }, [auditId, activeTab])

  const fetchAuditDetails = async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'evidence') {
        // Fetch all evidence with pagination
        let allEvidence = []
        let hasMore = true
        let pageCursor = null
        
        while (hasMore) {
          const params = { pageSize: 100 }
          if (pageCursor) params.pageCursor = pageCursor
          
          const response = await api.get(`/api/audits/${auditId}/evidence`, { params })
          console.log('Evidence page:', response.data)
          
          const responseData = response.data.results || response.data
          const evidenceArray = responseData.data || responseData || []
          allEvidence = [...allEvidence, ...evidenceArray]
          
          // Check if there are more pages
          const pageInfo = responseData.pageInfo
          hasMore = pageInfo?.hasNextPage || false
          pageCursor = pageInfo?.endCursor || null
          
          console.log(`Fetched ${evidenceArray.length} items, total: ${allEvidence.length}, hasMore: ${hasMore}`)
        }
        
        console.log(`Total evidence items fetched: ${allEvidence.length}`)
        setEvidence(allEvidence)
      } else if (activeTab === 'controls') {
        const response = await api.get(`/api/audits/${auditId}/controls`)
        console.log('Controls data:', response.data)
        const responseData = response.data.results || response.data
        const controlsArray = responseData.data || responseData || []
        setControls(Array.isArray(controlsArray) ? controlsArray : [])
      } else if (activeTab === 'comments') {
        const response = await api.get(`/api/audits/${auditId}/comments`)
        console.log('Comments data:', response.data)
        const responseData = response.data.results || response.data
        const commentsArray = responseData.data || responseData || []
        setComments(Array.isArray(commentsArray) ? commentsArray : [])
      }
      
      setError(null)
    } catch (err) {
      const errorDetails = err.response?.data?.details || err.response?.data?.error || err.message
      const errorMsg = `Failed to fetch ${activeTab}: ${errorDetails}`
      setError(errorMsg)
      console.error('Frontend error:', err)
      console.error('Response:', err.response)
      
      // For comments, show empty list if error
      if (activeTab === 'comments' && err.response?.status === 500) {
        setComments([])
      }
    } finally {
      setLoading(false)
    }
  }

  const updateEvidenceState = async (evidenceId, newState) => {
    // Prompt for auditor email
    const auditorEmail = prompt('Enter your auditor email address:', localStorage.getItem('auditorEmail') || '');
    if (!auditorEmail) {
      alert('Auditor email is required to update evidence state');
      return;
    }
    
    // Save email for future use
    localStorage.setItem('auditorEmail', auditorEmail);
    
    try {
      const response = await api.put(`/api/audits/${auditId}/evidence/${evidenceId}`, {
        statusUpdate: {
          auditorEmail: auditorEmail,
          stateTransition: newState
        }
      })
      console.log('Evidence update response:', response.data)
      // Refresh the evidence list to show the updated state
      fetchAuditDetails()
    } catch (err) {
      console.error('Failed to update evidence:', err)
      console.error('Error details:', err.response?.data)
      alert(`Failed to update evidence state: ${err.response?.data?.details || err.message}`)
    }
  }

  const addComment = async (evidenceId, comment) => {
    try {
      await api.post(`/api/audits/${auditId}/evidence/${evidenceId}/comments`, {
        comment
      })
      setActiveTab('comments')
      fetchAuditDetails()
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkState || selectedEvidence.length === 0) {
      alert('Please select evidence items and an action')
      return
    }

    // Prompt for auditor email
    const auditorEmail = prompt('Enter your auditor email address:', localStorage.getItem('auditorEmail') || '');
    if (!auditorEmail) {
      alert('Auditor email is required to update evidence state');
      return;
    }
    
    // Save email for future use
    localStorage.setItem('auditorEmail', auditorEmail);

    try {
      const response = await api.post(`/api/audits/${auditId}/evidence/bulk-update`, {
        evidenceIds: selectedEvidence,
        state: bulkState,
        auditorEmail: auditorEmail
      })
      
      alert(response.data.message)
      setSelectedEvidence([])
      setBulkState('')
      fetchAuditDetails()
    } catch (err) {
      console.error('Failed to bulk update:', err)
      console.error('Error details:', err.response?.data)
      alert(`Failed to update evidence: ${err.response?.data?.details || err.message}`)
    }
  }

  const toggleEvidenceSelection = (evidenceId) => {
    setSelectedEvidence(prev => 
      prev.includes(evidenceId) 
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    )
  }

  const selectAll = () => {
    const visibleEvidenceIds = filteredEvidence.map(e => e.id)
    const allVisibleSelected = visibleEvidenceIds.every(id => selectedEvidence.includes(id))
    
    if (allVisibleSelected) {
      // Deselect all visible items
      setSelectedEvidence(selectedEvidence.filter(id => !visibleEvidenceIds.includes(id)))
    } else {
      // Select all visible items (add to existing selection)
      setSelectedEvidence([...new Set([...selectedEvidence, ...visibleEvidenceIds])])
    }
  }

  const fetchEvidenceUrls = async (evidenceId) => {
    try {
      const response = await api.get(`/api/audits/${auditId}/evidence/${evidenceId}/urls`)
      console.log('Evidence URLs response:', response.data)
      
      // Try different possible response structures
      let urls = []
      if (response.data) {
        if (response.data.results?.data) {
          urls = response.data.results.data
        } else if (response.data.data) {
          urls = response.data.data
        } else if (Array.isArray(response.data.results)) {
          urls = response.data.results
        } else if (Array.isArray(response.data)) {
          urls = response.data
        } else {
          console.log('Unexpected response structure:', response.data)
        }
      }
      
      console.log('Parsed URLs:', urls)
      setEvidenceUrls(prev => ({ ...prev, [evidenceId]: urls }))
      return urls
    } catch (err) {
      console.error('Failed to fetch evidence URLs:', err)
      console.error('Error response:', err.response)
      return []
    }
  }

  const viewDocuments = async (evidenceItem) => {
    const urls = await fetchEvidenceUrls(evidenceItem.id)
    setDocumentModal({
      evidence: evidenceItem,
      urls: urls
    })
  }

  // Filter evidence based on search term
  const filteredEvidence = evidence.filter(item => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    const name = item.evidenceControl?.name || ''
    const description = item.evidenceControl?.description || item.description || ''
    const status = item.status || item.state || ''
    const type = item.type || ''
    
    return (
      name.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower) ||
      type.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="audit-detail">
      <div className="detail-header">
        <Link to="/" className="back-link">← Back to Audits</Link>
        <h2>{audit ? `${audit.customerDisplayName} - ${audit.framework}` : 'Audit Details'}</h2>
        {audit && (
          <p className="audit-info">
            Audit Period: {new Date(audit.auditStartDate).toLocaleDateString()} - {new Date(audit.auditEndDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'evidence' ? 'active' : ''}
          onClick={() => setActiveTab('evidence')}
        >
          Evidence
        </button>
        <button 
          className={activeTab === 'controls' ? 'active' : ''}
          onClick={() => setActiveTab('controls')}
        >
          Controls
        </button>
        <button 
          className={activeTab === 'comments' ? 'active' : ''}
          onClick={() => setActiveTab('comments')}
        >
          Comments
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {activeTab === 'evidence' && (
              <div className="evidence-section">
                {evidence.length > 0 && <EvidenceSummary evidence={evidence} />}
                
                {/* Search Bar */}
                {evidence.length > 0 && (
                  <div className="search-container" style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <input
                      type="text"
                      placeholder="Search evidence by name, description, status, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                    {searchTerm && (
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Showing {filteredEvidence.length} of {evidence.length} evidence items
                      </p>
                    )}
                  </div>
                )}
                
                {filteredEvidence.length > 0 && (
                  <div className="bulk-actions">
                    <button onClick={selectAll} className="select-all-btn">
                      {filteredEvidence.every(e => selectedEvidence.includes(e.id)) ? 'Deselect Visible' : 'Select Visible'}
                    </button>
                    <select 
                      value={bulkState} 
                      onChange={(e) => setBulkState(e.target.value)}
                      className="bulk-state-select"
                    >
                      <option value="">Select Action...</option>
                      <option value="ACCEPT">Accept</option>
                      <option value="READY_FOR_AUDIT">Ready for Audit</option>
                      <option value="FLAG">Flag</option>
                      <option value="MARK_NA">Mark N/A</option>
                      <option value="MARK_APPLICABLE">Mark Applicable</option>
                    </select>
                    <button 
                      onClick={handleBulkUpdate} 
                      disabled={selectedEvidence.length === 0 || !bulkState}
                      className="bulk-update-btn"
                    >
                      Update {selectedEvidence.length} Selected
                    </button>
                  </div>
                )}
                
                <div className="evidence-list">
                  {filteredEvidence.length === 0 ? (
                    <p>{searchTerm ? 'No evidence matches your search' : 'No evidence found'}</p>
                  ) : (
                    filteredEvidence.map(item => (
                      <div key={item.id} className={`evidence-item ${selectedEvidence.includes(item.id) ? 'selected' : ''}`}>
                        <div className="evidence-header">
                          <input 
                            type="checkbox"
                            checked={selectedEvidence.includes(item.id)}
                            onChange={() => toggleEvidenceSelection(item.id)}
                            className="evidence-checkbox"
                          />
                          <h4>{item.name || item.evidenceControl?.name || 'Evidence ' + item.id}</h4>
                        </div>
                        
                        {item.description && (
                          <p className="control-description">{item.description}</p>
                        )}
                        <p>Type: {item.evidenceType || 'N/A'}</p>
                        <p>Status: <span className={`state-${item.status}`}>{item.status || 'Unknown'}</span></p>
                        {item.testStatus && <p>Test Status: {item.testStatus}</p>}
                        <p>Updated: {new Date(item.statusUpdatedDate || item.modificationDate || item.creationDate).toLocaleString()}</p>
                        {item.relatedControls && item.relatedControls.length > 0 && (
                          <p>Related Controls: {item.relatedControls.map(c => c.name).join(', ')}</p>
                        )}
                        
                        <div className="evidence-actions">
                          <select 
                            value={item.state || item.evidenceState || ''} 
                            onChange={(e) => updateEvidenceState(item.id, e.target.value)}
                          >
                            <option value="">Select Action</option>
                            <option value="ACCEPT">Accept</option>
                            <option value="READY_FOR_AUDIT">Ready for Audit</option>
                            <option value="FLAG">Flag</option>
                            <option value="MARK_NA">Mark N/A</option>
                            <option value="MARK_APPLICABLE">Mark Applicable</option>
                          </select>
                          
                          <button onClick={() => viewDocuments(item)}>
                            View Documents
                          </button>
                          
                          <button onClick={() => {
                            const comment = prompt('Add a comment:')
                            if (comment) addComment(item.id, comment)
                          }}>
                            Add Comment
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'controls' && (
              <div className="controls-list">
                {controls.length === 0 ? (
                  <p>No controls found</p>
                ) : (
                  controls.map(control => (
                    <div key={control.id} className="control-item">
                      <h4>{control.name || control.control?.name || 'Control ' + control.id}</h4>
                      {control.description && <p className="control-description">{control.description}</p>}
                      <p>Domain: {control.domain || control.control?.domain || 'N/A'}</p>
                      <p>Source: {control.source || control.control?.source || 'N/A'}</p>
                      <p>Framework: {control.frameworkSection?.name || 'N/A'}</p>
                      <p>Owner: {control.owner?.email || control.control?.owner?.email || 'Unassigned'}</p>
                      {control.status && <p>Status: {control.status}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p>No comments found</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <p className="comment-text">{comment.text}</p>
                      <p className="comment-meta">
                        By {comment.email} • 
                        {new Date(comment.creationDate).toLocaleString()}
                      </p>
                      {comment.auditEvidenceId && (
                        <p className="comment-evidence">
                          Related to Evidence ID: {comment.auditEvidenceId}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {documentModal && (
        <div className="document-modal-overlay" onClick={() => setDocumentModal(null)}>
          <div className="document-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Documents for: {documentModal.evidence.evidenceControl?.name || 'Evidence'}</h3>
              <button onClick={() => setDocumentModal(null)} className="close-modal">×</button>
            </div>
            
            <div className="modal-content">
              {documentModal.urls.length === 0 ? (
                <p>No documents available for this evidence.</p>
              ) : (
                <div className="document-list">
                  {console.log('Rendering documents:', documentModal.urls)}
                  {documentModal.urls.map((urlItem, index) => {
                    console.log('Document item:', urlItem);
                    // Try to find the actual URL in different possible fields
                    const documentUrl = urlItem.url || urlItem.downloadUrl || urlItem.signedUrl || urlItem.link;
                    const documentName = urlItem.name || urlItem.fileName || urlItem.title || `Document ${index + 1}`;
                    let documentType = urlItem.fileType || urlItem.mimeType || urlItem.contentType || 'Unknown';
                    
                    console.log('Document URL:', documentUrl);
                    console.log('Document Name:', documentName);
                    console.log('Document Type (before detection):', documentType);
                    
                    // Try to determine type from URL or name if type is unknown
                    if (documentType === 'Unknown' || !documentType) {
                      const urlLower = (documentUrl || '').toLowerCase();
                      const nameLower = (documentName || '').toLowerCase();
                      
                      if (urlLower.includes('.pdf') || nameLower.includes('.pdf')) {
                        documentType = 'application/pdf';
                      } else if (['.png', '.jpg', '.jpeg', '.gif'].some(ext => urlLower.includes(ext) || nameLower.includes(ext))) {
                        documentType = 'image';
                      } else if (urlLower.includes('.json') || nameLower.includes('.json')) {
                        documentType = 'application/json';
                      } else if (nameLower.includes('policy') || nameLower.includes('document') || nameLower.includes('report')) {
                        // Many PDFs don't have extensions but have document-like names
                        documentType = 'application/pdf';
                      }
                    }
                    
                    console.log('Document Type (after detection):', documentType);
                    
                    return (
                      <div key={urlItem.id || index} className="document-item">
                        <h4>{documentName}</h4>
                        {urlItem.description && <p>{urlItem.description}</p>}
                        {(urlItem.uploadedAt || urlItem.createdAt || urlItem.creationDate) && 
                          <p>Uploaded: {new Date(urlItem.uploadedAt || urlItem.createdAt || urlItem.creationDate).toLocaleDateString()}</p>
                        }
                        
                        <div className="document-actions">
                          {documentUrl ? (
                            <>
                              <a 
                                href={documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="view-link"
                              >
                                Open in New Tab
                              </a>
                              
                              {/* Show images directly */}
                              {(documentType?.includes('image') || 
                                ['.png', '.jpg', '.jpeg', '.gif'].some(ext => documentUrl.toLowerCase().includes(ext))) && (
                                <img 
                                  src={`/api/proxy/document?url=${encodeURIComponent(documentUrl)}`} 
                                  alt={documentName} 
                                  className="document-preview"
                                  onError={(e) => {
                                    console.error('Image failed to load:', documentUrl);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              
                              {/* For PDFs, JSONs, and unknown types, show viewer with selector */}
                              {(documentType?.includes('pdf') || documentType?.includes('json') || 
                                documentUrl.includes('.pdf') || documentUrl.includes('.json') ||
                                (documentType === 'Unknown' && 
                                 !['.png', '.jpg', '.jpeg', '.gif'].some(ext => documentUrl.toLowerCase().includes(ext)))) && (
                                <DocumentViewerWithSelector 
                                  url={documentUrl} 
                                  name={documentName} 
                                  initialType={documentType}
                                />
                              )}
                            </>
                          ) : (
                            <div>
                              <p>URL not available</p>
                              <pre style={{fontSize: '0.8em', background: 'var(--surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)'}}>
                                {JSON.stringify(urlItem, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditDetail