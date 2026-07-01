import 'react-native-url-polyfill/auto';
// import 'expo-sqlite/localStorage/install'; // Used for persisting auth state, not needed for simple anonymous access, but let's keep it or comment it if it throws.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' && 
  supabasePublishableKey && 
  supabasePublishableKey !== 'sb_publishable_your_key_here';

export const isSupabaseConfigured = !!isConfigured;

let supabaseClient;

if (isSupabaseConfigured) {
  try {
    // Attempt to install expo-sqlite localStorage polyfill if it exists
    try {
      require('expo-sqlite/localStorage/install');
    } catch (e) {
      console.warn('Expo SQLite polyfill not loaded:', e.message);
    }
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
  } catch (error) {
    console.error('Failed to initialize real Supabase client:', error);
    isConfigured = false;
  }
}

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials not configured or set to placeholder. History features will be mock-disabled.');
  // Return a mock supabase client to prevent runtime crashes
  supabaseClient = {
    from: () => ({
      insert: async (payload) => {
        console.warn('Supabase: insert bypassed (not configured)', payload);
        return { data: null, error: null };
      },
      select: () => ({
        order: async () => {
          console.warn('Supabase: select bypassed (not configured)');
          return { data: [], error: null };
        }
      })
    })
  };
}

export const supabase = supabaseClient;
