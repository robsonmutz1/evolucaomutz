CREATE TABLE public.financeiro_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('despesa','produto','patrimonio')),
  descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
  categoria text NOT NULL DEFAULT '',
  data date,
  valor numeric(12,2),
  quantidade integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_registros TO authenticated;
GRANT ALL ON public.financeiro_registros TO service_role;
ALTER TABLE public.financeiro_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only finance records" ON public.financeiro_registros FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());