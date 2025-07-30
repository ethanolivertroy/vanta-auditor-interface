// Configuration for the Vanta Auditor Interface
export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'Vanta Auditor Interface',
  logo: import.meta.env.VITE_LOGO_URL || '/logo.svg',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || '',
  features: {
    darkMode: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false',
    bulkOperations: import.meta.env.VITE_ENABLE_BULK_OPS !== 'false',
    export: import.meta.env.VITE_ENABLE_EXPORT !== 'false'
  }
}