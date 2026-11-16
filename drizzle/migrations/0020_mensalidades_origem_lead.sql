CREATE TABLE public.origens_lead (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.origens_lead TO authenticated;
GRANT ALL ON public.origens_lead TO service_role;
ALTER TABLE public.origens_lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner origens" ON public.origens_lead FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());

ALTER TABLE public.alunos ADD COLUMN origem_lead text;

CREATE TABLE public.mensalidades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
 tipo text NOT NULL DEFAULT 'mensalidade' CHECK (tipo IN ('mensalidade','matricula')),
 parcela integer NOT NULL DEFAULT 1,
 referencia text NOT NULL CHECK (referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 vencimento date NOT NULL,
 valor numeric(12,2) NOT NULL CHECK (valor >= 0),
 situacao text NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta','paga','cancelada')),
 data_pagamento date,
 valor_pago numeric(12,2),
 forma_pagamento text CHECK (forma_pagamento IN ('dinheiro','pix','credito','debito')),
 banco text,
 conta_id uuid REFERENCES public.contas_caixa(id),
 lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE SET NULL,
 observacao text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mensalidades_aluno_idx ON public.mensalidades(aluno_id);
CREATE INDEX mensalidades_venc_idx ON public.mensalidades(situacao, vencimento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensalidades TO authenticated;
GRANT ALL ON public.mensalidades TO service_role;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner mensalidades" ON public.mensalidades FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());

CREATE OR REPLACE FUNCTION public.mensalidade_proteger() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF coalesce(current_setting('app.mensalidade_rpc',true),'')='sim' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
 IF TG_OP IN ('UPDATE','DELETE') AND OLD.situacao='paga' THEN RAISE EXCEPTION 'Parcela paga: desfaça a baixa antes de alterar.'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.situacao='paga' OR NEW.lancamento_id IS NOT NULL OR NEW.data_pagamento IS NOT NULL OR NEW.valor_pago IS NOT NULL THEN RAISE EXCEPTION 'Use a baixa para registrar pagamento.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER mensalidade_proteger BEFORE INSERT OR UPDATE OR DELETE ON public.mensalidades FOR EACH ROW EXECUTE FUNCTION public.mensalidade_proteger();

CREATE OR REPLACE FUNCTION public.mensalidade_baixar(p_id uuid, p_data date, p_valor numeric, p_forma text, p_banco text, p_conta uuid) RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE m public.mensalidades; a public.alunos; lid uuid;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 IF p_forma NOT IN ('dinheiro','pix','credito','debito') THEN RAISE EXCEPTION 'Informe a forma de pagamento.'; END IF;
 IF p_data IS NULL OR p_valor IS NULL OR p_valor <= 0 OR round(p_valor,2)<>p_valor THEN RAISE EXCEPTION 'Informe data e valor válidos.'; END IF;
 SELECT * INTO m FROM public.mensalidades WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada.'; END IF;
 IF m.situacao<>'aberta' THEN RAISE EXCEPTION 'Esta parcela não está em aberto.'; END IF;
 SELECT * INTO a FROM public.alunos WHERE id=m.aluno_id;
 INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,conta_id,situacao,data_pagamento,aluno_id,referencia_mensalidade,origem)
 VALUES (to_char(p_data,'YYYY-MM'),p_data,'entrada','Entradas operacionais',CASE WHEN m.tipo='matricula' THEN 'Matrícula' ELSE 'Mensalidade' END,p_valor,
  concat_ws(' · ',a.codigo||' '||a.nome,CASE WHEN m.tipo='matricula' THEN 'Matrícula' ELSE 'Parcela '||m.parcela||' ('||to_char(to_date(m.referencia,'YYYY-MM'),'MM/YYYY')||')' END,
   CASE p_forma WHEN 'dinheiro' THEN 'Dinheiro' WHEN 'pix' THEN 'Pix' WHEN 'credito' THEN 'Cartão de crédito' ELSE 'Cartão de débito' END, nullif(trim(p_banco),'')),
  p_conta,'realizado',p_data,m.aluno_id,CASE WHEN m.tipo='mensalidade' THEN m.referencia END,'mensalidade') RETURNING id INTO lid;
 PERFORM set_config('app.mensalidade_rpc','sim',true);
 UPDATE public.mensalidades SET situacao='paga',data_pagamento=p_data,valor_pago=p_valor,forma_pagamento=p_forma,banco=nullif(trim(p_banco),''),conta_id=p_conta,lancamento_id=lid WHERE id=p_id;
 PERFORM set_config('app.mensalidade_rpc','',true);
 RETURN lid;
END $$;

CREATE OR REPLACE FUNCTION public.mensalidade_estornar(p_id uuid) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE m public.mensalidades;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 SELECT * INTO m FROM public.mensalidades WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR m.situacao<>'paga' THEN RAISE EXCEPTION 'Esta parcela não está paga.'; END IF;
 PERFORM set_config('app.mensalidade_rpc','sim',true);
 UPDATE public.mensalidades SET situacao='aberta',data_pagamento=NULL,valor_pago=NULL,forma_pagamento=NULL,banco=NULL,conta_id=NULL,lancamento_id=NULL WHERE id=p_id;
 IF m.lancamento_id IS NOT NULL THEN PERFORM set_config('app.caixa_confirmado','sim',true); DELETE FROM public.lancamentos WHERE id=m.lancamento_id; END IF;
 PERFORM set_config('app.mensalidade_rpc','',true);
END $$;
GRANT EXECUTE ON FUNCTION public.mensalidade_baixar(uuid,date,numeric,text,text,uuid), public.mensalidade_estornar(uuid) TO authenticated;