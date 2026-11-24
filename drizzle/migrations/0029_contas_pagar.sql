CREATE TABLE public.contas_pagar (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 descricao text NOT NULL,
 grupo text NOT NULL DEFAULT '',
 categoria text NOT NULL DEFAULT '',
 valor numeric NOT NULL CHECK (valor > 0),
 vencimento date NOT NULL,
 recorrencia_id uuid,
 parcela integer,
 total_parcelas integer,
 situacao text NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta','paga')),
 data_pagamento date,
 valor_pago numeric,
 conta_id uuid REFERENCES public.contas_caixa(id),
 lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE SET NULL,
 observacao text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contas_pagar_venc_idx ON public.contas_pagar(vencimento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner contas_pagar" ON public.contas_pagar FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());

CREATE OR REPLACE FUNCTION public.conta_pagar_proteger() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF current_setting('app.conta_pagar_rpc', true) = 'sim' THEN RETURN COALESCE(NEW, OLD); END IF;
 IF TG_OP = 'DELETE' THEN
  IF OLD.situacao = 'paga' THEN RAISE EXCEPTION 'Estorne o pagamento antes de excluir.'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP = 'INSERT' THEN
  IF NEW.situacao <> 'aberta' OR NEW.lancamento_id IS NOT NULL OR NEW.data_pagamento IS NOT NULL OR NEW.valor_pago IS NOT NULL THEN RAISE EXCEPTION 'Use a baixa para registrar pagamento.'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.situacao = 'paga' THEN RAISE EXCEPTION 'Conta paga não pode ser alterada; estorne antes.'; END IF;
 IF NEW.situacao IS DISTINCT FROM OLD.situacao OR NEW.lancamento_id IS DISTINCT FROM OLD.lancamento_id OR NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento OR NEW.valor_pago IS DISTINCT FROM OLD.valor_pago THEN RAISE EXCEPTION 'Use a baixa para registrar pagamento.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conta_pagar_proteger BEFORE INSERT OR UPDATE OR DELETE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.conta_pagar_proteger();

CREATE OR REPLACE FUNCTION public.conta_pagar_baixar(p_id uuid, p_data date, p_valor numeric, p_conta uuid) RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE c public.contas_pagar; lid uuid;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 IF p_data IS NULL OR p_valor IS NULL OR p_valor <= 0 OR round(p_valor,2)<>p_valor THEN RAISE EXCEPTION 'Informe data e valor válidos.'; END IF;
 IF p_conta IS NULL THEN RAISE EXCEPTION 'Informe a conta de saída.'; END IF;
 SELECT * INTO c FROM public.contas_pagar WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
 IF c.situacao<>'aberta' THEN RAISE EXCEPTION 'Esta conta já foi paga.'; END IF;
 INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,conta_id,situacao,data_pagamento,origem)
 VALUES (to_char(p_data,'YYYY-MM'),p_data,'saida',c.grupo,COALESCE(NULLIF(c.categoria,''),c.descricao),p_valor,
  concat_ws(' · ',c.descricao,CASE WHEN c.parcela IS NOT NULL THEN 'Venc. '||to_char(c.vencimento,'DD/MM/YYYY') END),p_conta,'realizado',p_data,'contas_pagar') RETURNING id INTO lid;
 PERFORM set_config('app.conta_pagar_rpc','sim',true);
 UPDATE public.contas_pagar SET situacao='paga',data_pagamento=p_data,valor_pago=p_valor,conta_id=p_conta,lancamento_id=lid WHERE id=p_id;
 PERFORM set_config('app.conta_pagar_rpc','',true);
 RETURN lid;
END $$;

CREATE OR REPLACE FUNCTION public.conta_pagar_estornar(p_id uuid) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE c public.contas_pagar;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 SELECT * INTO c FROM public.contas_pagar WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.situacao<>'paga' THEN RAISE EXCEPTION 'Esta conta não está paga.'; END IF;
 PERFORM set_config('app.conta_pagar_rpc','sim',true);
 UPDATE public.contas_pagar SET situacao='aberta',data_pagamento=NULL,valor_pago=NULL,lancamento_id=NULL WHERE id=p_id;
 IF c.lancamento_id IS NOT NULL THEN PERFORM set_config('app.caixa_confirmado','sim',true); DELETE FROM public.lancamentos WHERE id=c.lancamento_id; END IF;
 PERFORM set_config('app.conta_pagar_rpc','',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.conta_pagar_baixar(uuid,date,numeric,uuid), public.conta_pagar_estornar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conta_pagar_baixar(uuid,date,numeric,uuid), public.conta_pagar_estornar(uuid) TO authenticated;