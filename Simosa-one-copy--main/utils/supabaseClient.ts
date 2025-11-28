import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fvctpdzxhnzeqwcsmrfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2Y3RwZHp4aG56ZXF3Y3NtcmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzQ0OTMsImV4cCI6MjA3OTc1MDQ5M30.aiuyOrjyCAjq6HdPUnruMfo7XnjYdyOLjKmKMKGTUNM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
