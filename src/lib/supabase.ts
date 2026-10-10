import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://njfaukgcozgbxgwxhmyu.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_vc2av1RqAOyYfao6qSC7wQ_WhlwpYvJ';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
