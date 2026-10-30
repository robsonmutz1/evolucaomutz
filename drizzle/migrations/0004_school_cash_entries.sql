CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL CHECK (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  grupo text NOT NULL DEFAULT '',
  categoria text NOT NULL,
  valor numeric NOT NULL CHECK (valor >= 0),
  descricao text,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lancamentos_mes_idx ON public.lancamentos(mes);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only cash entries" ON public.lancamentos FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());