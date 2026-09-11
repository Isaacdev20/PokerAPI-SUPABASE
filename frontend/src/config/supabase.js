// Arquivo: frontend/src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

// URL e Chave Pública do seu Supabase (Peguei do seu código original)
const SUPABASE_URL = 'https://fojwtwzcnwwfjdfapuvd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_afLlUxeI3Q-vem8qBwj_NA_eiGOgU_X';

// Cria e exporta o cliente para ser usado em outras partes do código
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
