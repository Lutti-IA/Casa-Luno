/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Função para obter as configurações (prioriza localStorage, depois env)
export const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('SUPABASE_URL');
  const localKey = localStorage.getItem('SUPABASE_ANON_KEY');
  
  const url = localUrl || import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  const isValid = url && url.startsWith('http') && !url.includes('your-project');
  
  return { url, key, isValid };
};

// Instância singleton
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  const { url, key, isValid } = getSupabaseConfig();
  
  if (!isValid) return null;
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
};

// Função para forçar a re-inicialização (útil após trocar chaves)
export const resetSupabaseClient = () => {
  supabaseInstance = null;
  return getSupabase();
};

export const supabase = getSupabase();
