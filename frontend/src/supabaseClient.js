import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// Reads directly from environment variables (.env / Vercel), with fallbacks.
// ============================================================================

const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  "https://juvpwwvyakldziwxltkm.supabase.co";

const SUPABASE_PUBLIC_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  "sb_publishable_GfETX2bGiMhMHcvYX5QIMg_pmsGlwg_";

// ============================================================================
// SUPABASE CLIENT EXPORT
// ============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

export default supabase;
