CREATE TABLE public.alunos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 codigo text NOT NULL DEFAULT '', nome text NOT NULL,
 responsavel text NOT NULL DEFAULT '', bairro text NOT NULL DEFAULT '', cidade text NOT NULL DEFAULT '',
 "dataMatricula" text NOT NULL DEFAULT '', curso text NOT NULL DEFAULT '', turma text NOT NULL DEFAULT '', horario text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Concluído','Cancelado')),
 "dataStatus" text,
 "valorMensal" numeric, "descontoTipo" text NOT NULL DEFAULT 'percentual' CHECK ("descontoTipo" IN ('percentual','valor')),
 desconto numeric NOT NULL DEFAULT 0, "diaLimiteDesconto" integer NOT NULL DEFAULT 0, "diaVencimento" integer NOT NULL DEFAULT 0,
 "qtdMensalidades" integer NOT NULL DEFAULT 0, "primeiraCobranca" text NOT NULL DEFAULT '', observacoes text,
 "matriculaPaga" text, "dataPagamentoMatricula" text,
 import_row integer UNIQUE, import_raw jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only school records" ON public.alunos FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());