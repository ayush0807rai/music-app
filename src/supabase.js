import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 5000)
  }
});
