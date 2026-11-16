CREATE TABLE public.pagamento_opcoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tipo text NOT NULL CHECK (tipo IN ('forma','banco')), nome text NOT NULL, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX pagamento_opcoes_nome ON public.pagamento_opcoes (tipo, lower(nome));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamento_opcoes TO authenticated;
GRANT ALL ON public.pagamento_opcoes TO service_role;
ALTER TABLE public.pagamento_opcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner payment options" ON public.pagamento_opcoes FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());
INSERT INTO public.pagamento_opcoes (tipo, nome) VALUES ('forma','Dinheiro'),('forma','Pix'),('forma','Cartão de crédito'),('forma','Cartão de débito'),('forma','Boleto'),('banco','Itaú'),('banco','C6'),('banco','Cora'),('banco','Ton');
ALTER TABLE public.mensalidades DROP CONSTRAINT mensalidades_forma_pagamento_check;
CREATE OR REPLACE FUNCTION public.mensalidade_baixar(p_id uuid, p_data date, p_valor numeric, p_forma text, p_banco text, p_conta uuid) RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE m public.mensalidades; a public.alunos; lid uuid; rot text;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 rot := CASE p_forma WHEN 'dinheiro' THEN 'Dinheiro' WHEN 'pix' THEN 'Pix' WHEN 'credito' THEN 'Cartão de crédito' WHEN 'debito' THEN 'Cartão de débito' ELSE nullif(trim(coalesce(p_forma,'')),'') END;
 IF rot IS NULL THEN RAISE EXCEPTION 'Informe a forma de pagamento.'; END IF;
 IF p_data IS NULL OR p_valor IS NULL OR p_valor <= 0 OR round(p_valor,2)<>p_valor THEN RAISE EXCEPTION 'Informe data e valor válidos.'; END IF;
 SELECT * INTO m FROM public.mensalidades WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada.'; END IF;
 IF m.situacao<>'aberta' THEN RAISE EXCEPTION 'Esta parcela não está em aberto.'; END IF;
 SELECT * INTO a FROM public.alunos WHERE id=m.aluno_id;
 INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,conta_id,situacao,data_pagamento,aluno_id,referencia_mensalidade,origem)
 VALUES (to_char(p_data,'YYYY-MM'),p_data,'entrada','Entradas operacionais',CASE WHEN m.tipo='matricula' THEN 'Matrícula' ELSE 'Mensalidade' END,p_valor,
  concat_ws(' · ',a.codigo||' '||a.nome,CASE WHEN m.tipo='matricula' THEN 'Matrícula' ELSE 'Parcela '||m.parcela||' ('||to_char(to_date(m.referencia,'YYYY-MM'),'MM/YYYY')||')' END, rot, nullif(trim(p_banco),'')),
  p_conta,'realizado',p_data,m.aluno_id,CASE WHEN m.tipo='mensalidade' THEN m.referencia END,'mensalidade') RETURNING id INTO lid;
 PERFORM set_config('app.mensalidade_rpc','sim',true);
 UPDATE public.mensalidades SET situacao='paga',data_pagamento=p_data,valor_pago=p_valor,forma_pagamento=left(rot,60),banco=nullif(trim(p_banco),''),conta_id=p_conta,lancamento_id=lid WHERE id=p_id;
 PERFORM set_config('app.mensalidade_rpc','',true);
 RETURN lid;
END $$;