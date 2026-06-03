import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''; // Usamos service_role en el backend para poder saltar RLS en tareas asíncronas, o fallback a publishable key

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
