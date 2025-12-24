// Supabase client for database operations
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Using fallback storage.')
}

// Create Supabase client (returns null if credentials missing - will use file fallback)
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

module.exports = { supabase, isSupabaseAvailable: () => supabase !== null }

