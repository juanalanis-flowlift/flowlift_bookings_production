
import { createClient } from '@supabase/supabase-js';

// Priority 1: Environment Variables (Production/CI)
// Priority 2: Local Storage (Development/Manual Setup)
const getStoredConfig = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  return {
    url: localStorage.getItem('FLOWLIFT_SUPABASE_URL') || '',
    key: localStorage.getItem('FLOWLIFT_SUPABASE_KEY') || ''
  };
};

const stored = getStoredConfig();

const supabaseUrl = process.env.SUPABASE_URL || stored.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || stored.key || 'placeholder';

export const isSupabaseConfigured = (!!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY) || 
                                    (!!stored.url && !!stored.key);

// Initialize the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Saves configuration to local storage and reloads the page to re-initialize the client
 */
export const saveConfig = (url: string, key: string) => {
  localStorage.setItem('FLOWLIFT_SUPABASE_URL', url);
  localStorage.setItem('FLOWLIFT_SUPABASE_KEY', key);
  window.location.reload();
};

/**
 * Clears local storage configuration
 */
export const clearConfig = () => {
  localStorage.removeItem('FLOWLIFT_SUPABASE_URL');
  localStorage.removeItem('FLOWLIFT_SUPABASE_KEY');
  window.location.reload();
};

export const getSession = async () => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getMemberships = async (userId: string) => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('organization_memberships')
    .select('*, organizations(*)')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};
