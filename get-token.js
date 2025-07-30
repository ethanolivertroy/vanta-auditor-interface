import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function getToken() {
  const CLIENT_ID = process.env.VANTA_CLIENT_ID;
  const CLIENT_SECRET = process.env.VANTA_CLIENT_SECRET;

  console.log('Using Client ID:', CLIENT_ID);
  console.log('Client Secret length:', CLIENT_SECRET?.length || 0);

  try {
    const response = await axios.post('https://api.vanta.com/oauth/token', {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'auditor-api.audit:read auditor-api.auditor:read auditor-api.audit:write auditor-api.auditor:write'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('\n✅ Token generated successfully!');
    console.log('Access Token:', response.data.access_token);
    console.log('Token Type:', response.data.token_type);
    console.log('Expires In:', response.data.expires_in, 'seconds');
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Failed to get token');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('\n⚠️  401 Unauthorized - Check your client credentials');
    }
  }
}

getToken();