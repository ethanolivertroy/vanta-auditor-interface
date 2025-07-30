import axios from 'axios'

// Create a custom axios instance
const api = axios.create()

// Add request interceptor to include credentials if they exist
api.interceptors.request.use((config) => {
  const credentials = localStorage.getItem('vanta_credentials')
  
  if (credentials) {
    // Add credentials to headers as base64 encoded
    config.headers['X-Vanta-Credentials'] = btoa(credentials)
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

export default api