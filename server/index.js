import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Vanta } from 'vanta-auditor-api-sdk';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const VANTA_CLIENT_ID = process.env.VANTA_CLIENT_ID;
const VANTA_CLIENT_SECRET = process.env.VANTA_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken(clientCredentials = null) {
  // Use provided credentials or fall back to environment variables
  const clientId = clientCredentials?.clientId || VANTA_CLIENT_ID;
  const clientSecret = clientCredentials?.clientSecret || VANTA_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Vanta credentials not provided. Please set up your credentials.');
  }
  
  // If using environment credentials and token is still valid, return it
  if (!clientCredentials && accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }

  try {
    console.log('Attempting to get token with client_id:', clientId);
    
    const response = await axios.post('https://api.vanta.com/oauth/token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'auditor-api.audit:read auditor-api.auditor:read auditor-api.audit:write auditor-api.auditor:write'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const token = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;
    
    // Only cache token if using environment credentials
    if (!clientCredentials) {
      accessToken = token;
      tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    console.error('Token request failed with status:', error.response?.status);
    console.error('Token request URL:', error.config?.url);
    throw new Error(`Failed to authenticate with Vanta: ${error.response?.data?.error || error.message}`);
  }
}

async function getVantaClient(clientCredentials = null) {
  const token = await getAccessToken(clientCredentials);
  return new Vanta({
    bearerAuth: token
  });
}

// Middleware to extract client credentials from headers
function extractClientCredentials(req) {
  const authHeader = req.headers['x-vanta-credentials'];
  if (authHeader) {
    try {
      return JSON.parse(Buffer.from(authHeader, 'base64').toString());
    } catch (e) {
      console.error('Failed to parse client credentials:', e);
    }
  }
  return null;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test-token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ 
      success: true, 
      tokenReceived: !!token,
      tokenLength: token?.length || 0,
      message: 'Token generated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/test-credentials', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }
    
    // Test the credentials by attempting to get a token
    const response = await axios.post('https://api.vanta.com/oauth/token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'auditor-api.audit:read auditor-api.auditor:read auditor-api.audit:write auditor-api.auditor:write'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data.access_token) {
      res.json({ success: true, message: 'Credentials validated successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid response from Vanta' });
    }
  } catch (error) {
    console.error('Credential test error:', error.response?.data || error.message);
    res.status(400).json({ 
      success: false, 
      error: 'Invalid credentials or authentication failed' 
    });
  }
});

app.get('/api/test-comments/:auditId', async (req, res) => {
  try {
    const clientCredentials = extractClientCredentials(req);
    const token = await getAccessToken(clientCredentials);
    console.log('Test comments endpoint - Token:', token ? 'Present' : 'Missing');
    
    // Try a simple curl-like request
    const url = `https://api.vanta.com/v1/audits/${req.params.auditId}/comments?pageSize=5`;
    console.log('Fetching from URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    console.error('Test comments error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
});

app.get('/api/audits', async (req, res) => {
  try {
    console.log('Fetching audits...');
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.list({
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 20,
      pageCursor: req.query.pageCursor
    });
    
    console.log('Audits response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error fetching audits:', error.message);
    console.error('Full error:', error.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to fetch audits',
      details: error.response?.data || error.message 
    });
  }
});

app.get('/api/audits/:auditId/evidence', async (req, res) => {
  try {
    console.log('Fetching evidence for audit:', req.params.auditId);
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.listEvidence({
      auditId: req.params.auditId,
      pageSize: req.query.pageSize ? Math.min(parseInt(req.query.pageSize), 100) : 50,
      pageCursor: req.query.pageCursor
    });
    
    console.log('Evidence response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error fetching evidence:', error.message);
    console.error('Full error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

app.get('/api/audits/:auditId/evidence/:evidenceId/urls', async (req, res) => {
  try {
    console.log('Fetching evidence URLs for audit:', req.params.auditId, 'evidence:', req.params.evidenceId);
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.getEvidenceUrls({
      auditId: req.params.auditId,
      auditEvidenceId: req.params.evidenceId,  // Note: API expects auditEvidenceId
      pageSize: 50
    });
    
    console.log('Evidence URLs response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error fetching evidence URLs:', error.message);
    console.error('Full error:', error);
    
    // Check if it's a validation error from the SDK
    if (error.name === 'ResponseValidationError') {
      // Try to return the raw data if validation failed
      if (error.rawValue) {
        console.log('Returning raw value despite validation error:', error.rawValue);
        res.json(error.rawValue);
        return;
      }
    }
    
    // Check for 404 - evidence might not have any URLs
    if (error.response?.status === 404 || error.statusCode === 404) {
      console.log('No URLs found for this evidence (404)');
      res.json({ results: { data: [], pageInfo: { hasNextPage: false } } });
      return;
    }
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch evidence URLs',
      details: error.response?.data || error.message,
      evidenceId: req.params.evidenceId
    });
  }
});

app.get('/api/audits/:auditId/controls', async (req, res) => {
  try {
    console.log('Fetching controls for audit:', req.params.auditId);
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.listControls({
      auditId: req.params.auditId,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 50,
      pageCursor: req.query.pageCursor
    });
    
    console.log('Controls response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error fetching controls:', error.message);
    console.error('Full error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch controls' });
  }
});

app.get('/api/audits/:auditId/comments', async (req, res) => {
  try {
    console.log('Fetching comments for audit:', req.params.auditId);
    const clientCredentials = extractClientCredentials(req);
    const token = await getAccessToken(clientCredentials);
    
    // Use axios directly to bypass SDK validation issues
    const response = await axios.get(
      `https://api.vanta.com/v1/audits/${req.params.auditId}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 50,
          pageCursor: req.query.pageCursor
        }
      }
    );
    
    console.log('Comments response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    }
    console.error('Full error:', error);
    
    // If it's a 404, it might mean no comments exist yet
    if (error.response?.status === 404) {
      res.json({ results: { data: [], pageInfo: { hasNextPage: false } } });
    } else {
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch comments',
        details: error.response?.data || error.message,
        status: error.response?.status
      });
    }
  }
});

app.put('/api/audits/:auditId/evidence/:evidenceId', async (req, res) => {
  try {
    console.log('Update evidence request:', {
      auditId: req.params.auditId,
      evidenceId: req.params.evidenceId,
      body: JSON.stringify(req.body, null, 2)
    });
    
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.updateEvidence({
      auditId: req.params.auditId,
      auditEvidenceId: req.params.evidenceId,  // SDK expects auditEvidenceId, not evidenceId
      auditEvidenceUpdateInput: req.body
    });
    
    console.log('Update evidence success:', result);
    res.json(result);
  } catch (error) {
    console.error('Error updating evidence:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to update evidence',
      details: error.response?.data || error.message 
    });
  }
});

app.post('/api/audits/:auditId/evidence/bulk-update', async (req, res) => {
  try {
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const { evidenceIds, state, auditorEmail } = req.body;
    
    if (!auditorEmail) {
      return res.status(400).json({ error: 'Auditor email is required' });
    }
    
    console.log(`Bulk updating ${evidenceIds.length} evidence items to state: ${state}`);
    
    const results = await Promise.allSettled(
      evidenceIds.map(evidenceId => 
        vanta.audits.updateEvidence({
          auditId: req.params.auditId,
          auditEvidenceId: evidenceId,  // SDK expects auditEvidenceId, not evidenceId
          auditEvidenceUpdateInput: { 
            statusUpdate: {
              auditorEmail: auditorEmail,
              stateTransition: state
            }
          }
        })
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      message: `Updated ${successful} evidence items successfully`,
      successful,
      failed,
      details: results.map((r, i) => ({
        evidenceId: evidenceIds[i],
        status: r.status,
        error: r.status === 'rejected' ? r.reason?.message : null
      }))
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to bulk update evidence' });
  }
});

app.post('/api/audits/:auditId/evidence/:evidenceId/comments', async (req, res) => {
  try {
    const clientCredentials = extractClientCredentials(req);
    const vanta = await getVantaClient(clientCredentials);
    const result = await vanta.audits.createCommentForEvidence({
      auditId: req.params.auditId,
      evidenceId: req.params.evidenceId,
      addCommentInput: req.body
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Proxy endpoint for fetching document content
app.get('/api/proxy/document', async (req, res) => {
  try {
    const documentUrl = req.query.url;
    
    if (!documentUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Proxying document request for:', documentUrl);
    
    // Fetch the document
    const response = await axios.get(documentUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': '*/*'
      }
    });
    
    // Get content type from response or try to detect it
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });
    
    // For JSON or text content, convert to string
    if (contentType.includes('json') || contentType.includes('text')) {
      const text = Buffer.from(response.data).toString('utf-8');
      res.send(text);
    } else {
      // For binary content (PDFs, images), send as-is
      res.send(response.data);
    }
  } catch (error) {
    console.error('Error proxying document:', error.message);
    console.error('URL was:', req.query.url);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      res.status(error.response.status).json({ 
        error: `Failed to fetch document: ${error.response.status}` 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});