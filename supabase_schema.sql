-- # INSTRUÇÕES PARA O SUPABASE #
-- 1. Abra o seu projeto no Supabase.
-- 2. No menu lateral, clique em "SQL Editor".
-- 3. Clique em "New Query".
-- 4. Cole o código abaixo e clique em "Run".

-- === INÍCIO DO CÓDIGO SQL ===

-- Criar a extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar o tipo de transação (ENUM)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('REVENUE', 'EXPENSE', 'VARIANCE');
    END IF;
END $$;

-- Criar a tabela de transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL, -- Preparado para autenticação futura
    type transaction_type NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar Row Level Security (RLS)
-- Isso é fundamental para a segurança do banco
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública (ou restringir se houver login)
-- Por enquanto, vamos permitir acesso total para que o app funcione sem login obrigatório agora
DROP POLICY IF EXISTS "Permitir Acesso Público Total" ON public.transactions;
CREATE POLICY "Permitir Acesso Público Total" 
ON public.transactions FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comentário explicativo
COMMENT ON TABLE public.transactions IS 'Tabela de movimentações financeiras da Gestão Lotérica.';

-- === FIM DO CÓDIGO SQL ===
