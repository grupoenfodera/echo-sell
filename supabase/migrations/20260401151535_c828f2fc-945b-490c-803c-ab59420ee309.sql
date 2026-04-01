
-- ══════════════════════════════════════════
-- TABELAS
-- ══════════════════════════════════════════

CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  plano TEXT DEFAULT 'basico',
  consultas_mes INT DEFAULT 0,
  consultas_total INT DEFAULT 0,
  tokens_total BIGINT DEFAULT 0,
  custo_total_usd DECIMAL(10,6) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  primeiro_acesso BOOLEAN DEFAULT true,
  tipo_acesso TEXT,
  acesso_svp_expira TIMESTAMPTZ,
  cancelamento_solicitado BOOLEAN DEFAULT false,
  pagamento_atrasado BOOLEAN DEFAULT false,
  motivo_bloqueio TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acesso TIMESTAMPTZ
);

CREATE TABLE public.usuario_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  tom_primario TEXT,
  tom_secundario TEXT,
  peso_secundario INT DEFAULT 30,
  contexto TEXT,
  ticket_medio TEXT,
  nicho_principal TEXT,
  bloco_injetado TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ,
  UNIQUE(usuario_id)
);

CREATE TABLE public.geracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  modalidade TEXT NOT NULL,
  contexto_geracao TEXT,
  nicho TEXT,
  produto TEXT,
  tokens_entrada INT DEFAULT 0,
  tokens_saida INT DEFAULT 0,
  tokens_total INT DEFAULT 0,
  custo_usd DECIMAL(10,6) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  sale_id TEXT UNIQUE,
  produto_id TEXT,
  tipo TEXT,
  valor DECIMAL(10,2),
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento TEXT,
  email_cliente TEXT,
  produto_id TEXT,
  sale_id TEXT,
  status_processamento TEXT,
  erro_mensagem TEXT,
  payload_raw JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade TEXT NOT NULL,
  versao INT NOT NULL DEFAULT 1,
  conteudo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- usuarios: SELECT/UPDATE own row
CREATE POLICY "usuarios_select_own" ON public.usuarios FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "usuarios_update_own" ON public.usuarios FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- usuario_dna: SELECT/INSERT/UPDATE own
CREATE POLICY "dna_select_own" ON public.usuario_dna FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "dna_insert_own" ON public.usuario_dna FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "dna_update_own" ON public.usuario_dna FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- geracoes: SELECT/INSERT own
CREATE POLICY "geracoes_select_own" ON public.geracoes FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "geracoes_insert_own" ON public.geracoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- compras: SELECT own
CREATE POLICY "compras_select_own" ON public.compras FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

-- webhook_logs e system_prompts: sem acesso do cliente (apenas service_role)
-- Não criar policies = nenhum acesso via anon/authenticated

-- ══════════════════════════════════════════
-- TRIGGER: auto-create usuarios on auth signup
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
