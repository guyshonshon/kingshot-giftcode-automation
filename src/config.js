// Platform-agnostic API base URL configuration
// Automatically detects the platform and uses the correct API path

const getApiBase = () => {
  // Check if we're on Vercel
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return '/api'
  }
  
  // Check if we're on Cloudflare Pages
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return '/api'
  }
  
  // Check if we're on Render
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return '/api'
  }
  
  // Check for environment variable override
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  
  // Default to Netlify for local dev and Netlify deployments
  return '/.netlify/functions'
}

export const API_BASE = getApiBase()

