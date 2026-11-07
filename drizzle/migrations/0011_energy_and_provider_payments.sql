CREATE TABLE public.prestadores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, valor_hora numeric NOT NULL DEFAULT 0 CHECK(valor_hora>=0), ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.prestadores TO authenticated; GRANT ALL ON public.prestadores TO service_role;
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner providers" ON public.prestadores FOR ALL TO authenticated USING(public.has_owner_access()) WITH CHECK(public.has_owner_access());
CREATE UNIQUE INDEX prestadores_nome_unico ON public.prestadores(public.financeiro_nome_chave(nome));
CREATE TABLE public.prestador_pagamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prestador_id uuid NOT NULL REFERENCES public.prestadores(id), mes text NOT NULL, data_pagamento date NOT NULL, valor numeric NOT NULL CHECK(valor>0), lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE RESTRICT, UNIQUE(prestador_id,mes));
GRANT SELECT ON public.prestador_pagamentos TO authenticated; GRANT ALL ON public.prestador_pagamentos TO service_role;
ALTER TABLE public.prestador_pagamentos ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner reads payments" ON public.prestador_pagamentos FOR SELECT TO authenticated USING(public.has_owner_access());
CREATE TABLE public.prestador_aulas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prestador_id uuid NOT NULL REFERENCES public.prestadores(id), data date NOT NULL, horas numeric NOT NULL CHECK(horas>0), valor_hora numeric NOT NULL CHECK(valor_hora>=0), descricao text NOT NULL DEFAULT '', pagamento_id uuid REFERENCES public.prestador_pagamentos(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.prestador_aulas TO authenticated; GRANT ALL ON public.prestador_aulas TO service_role;
ALTER TABLE public.prestador_aulas ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner lessons" ON public.prestador_aulas FOR ALL TO authenticated USING(public.has_owner_access()) WITH CHECK(public.has_owner_access());
CREATE INDEX prestador_aulas_data ON public.prestador_aulas(prestador_id,data);
CREATE TABLE public.energia_registros (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mes text NOT NULL UNIQUE, medidor numeric CHECK(medidor>=0), consumo_kwh numeric CHECK(consumo_kwh>=0), valor numeric CHECK(valor>=0), data_pagamento date, lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE RESTRICT, observacoes text NOT NULL DEFAULT '');
GRANT SELECT,INSERT,UPDATE,DELETE ON public.energia_registros TO authenticated; GRANT ALL ON public.energia_registros TO service_role;
ALTER TABLE public.energia_registros ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner energy" ON public.energia_registros FOR ALL TO authenticated USING(public.has_owner_access()) WITH CHECK(public.has_owner_access());
CREATE OR REPLACE FUNCTION public.prestador_proteger_aula() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE pid uuid; d date;
BEGIN
pid:=CASE WHEN TG_OP='DELETE' THEN OLD.prestador_id ELSE NEW.prestador_id END;
PERFORM pg_advisory_xact_lock(hashtext('prestador:'||pid::text));
IF TG_OP<>'INSERT' AND OLD.pagamento_id IS NOT NULL THEN RAISE EXCEPTION 'Aulas pagas não podem ser alteradas.'; END IF;
IF TG_OP='DELETE' THEN RETURN OLD; END IF;
d:=NEW.data;
IF EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE prestador_id=pid AND mes=to_char(d,'YYYY-MM')) THEN RAISE EXCEPTION 'Este mês já foi pago.'; END IF;
IF NEW.pagamento_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE id=NEW.pagamento_id AND prestador_id=pid AND mes=to_char(d,'YYYY-MM')) THEN RAISE EXCEPTION 'Pagamento inválido.'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER prestador_proteger_aula BEFORE INSERT OR UPDATE OR DELETE ON public.prestador_aulas FOR EACH ROW EXECUTE FUNCTION public.prestador_proteger_aula();
CREATE OR REPLACE FUNCTION public.prestador_pagar(p_prestador uuid,p_mes text,p_data date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total numeric; lid uuid; payid uuid; pname text;
BEGIN
IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
IF p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' OR p_data IS NULL THEN RAISE EXCEPTION 'Informe mês e data válidos.'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('prestador:'||p_prestador::text));
SELECT id INTO payid FROM public.prestador_pagamentos WHERE prestador_id=p_prestador AND mes=p_mes;
IF payid IS NOT NULL THEN RETURN payid; END IF;
SELECT nome INTO pname FROM public.prestadores WHERE id=p_prestador;
SELECT sum(round(horas*valor_hora,2)) INTO total FROM public.prestador_aulas WHERE prestador_id=p_prestador AND to_char(data,'YYYY-MM')=p_mes AND pagamento_id IS NULL;
IF total IS NULL OR total<=0 THEN RAISE EXCEPTION 'Não há aulas a pagar.'; END IF;
INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,origem) VALUES(to_char(p_data,'YYYY-MM'),p_data,'saida','Despesas com pessoal','Salário Prestador de Serviço',total,pname||' · aulas de '||p_mes,'prestadores') RETURNING id INTO lid;
-- Mark lessons before closing the month; all writes share the provider lock.
payid:=gen_random_uuid();
INSERT INTO public.prestador_pagamentos(id,prestador_id,mes,data_pagamento,valor,lancamento_id) VALUES(payid,p_prestador,p_mes,p_data,total,lid);
-- Trigger allows only the initial assignment belonging to this exact payment.
UPDATE public.prestador_aulas SET pagamento_id=payid WHERE prestador_id=p_prestador AND to_char(data,'YYYY-MM')=p_mes AND pagamento_id IS NULL;
RETURN payid;
END $$;
REVOKE ALL ON FUNCTION public.prestador_pagar(uuid,text,date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.prestador_pagar(uuid,text,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.energia_salvar(p_row jsonb,p_lancar boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid; lid uuid; oldlid uuid; m text; v numeric; dt date; candidates integer;
BEGIN
IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
m:=p_row->>'mes';v:=NULLIF(p_row->>'valor','')::numeric;dt:=NULLIF(p_row->>'data_pagamento','')::date;
IF m !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Mês inválido.'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('energia:'||m));
SELECT id,lancamento_id INTO eid,oldlid FROM public.energia_registros WHERE mes=m;
lid:=oldlid;
IF p_lancar AND lid IS NULL THEN
IF v IS NULL OR v<=0 OR dt IS NULL THEN RAISE EXCEPTION 'Informe valor e data do pagamento.'; END IF;
SELECT count(*),(array_agg(id))[1] INTO candidates,lid FROM public.lancamentos WHERE tipo='saida' AND mes=m AND public.financeiro_nome_chave(categoria)=public.financeiro_nome_chave('Energia Elétrica');
IF candidates>0 THEN
IF candidates<>1 OR NOT EXISTS(SELECT 1 FROM public.lancamentos WHERE id=lid AND valor=v) THEN RAISE EXCEPTION 'Há uma saída de energia diferente neste mês. Confira antes de lançar.'; END IF;
ELSE
INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,origem) VALUES(to_char(dt,'YYYY-MM'),dt,'saida','Utilidades','Energia Elétrica',v,'Energia · referência '||m,'energia') RETURNING id INTO lid;
END IF;
END IF;
IF oldlid IS NOT NULL AND EXISTS(SELECT 1 FROM public.lancamentos WHERE id=oldlid AND valor IS DISTINCT FROM v) THEN RAISE EXCEPTION 'Valor já lançado: corrija a saída financeira antes de alterar este controle.'; END IF;
INSERT INTO public.energia_registros(mes,medidor,consumo_kwh,valor,data_pagamento,lancamento_id,observacoes) VALUES(m,NULLIF(p_row->>'medidor','')::numeric,NULLIF(p_row->>'consumo_kwh','')::numeric,v,dt,lid,coalesce(p_row->>'observacoes','')) ON CONFLICT(mes) DO UPDATE SET medidor=excluded.medidor,consumo_kwh=excluded.consumo_kwh,valor=excluded.valor,data_pagamento=excluded.data_pagamento,lancamento_id=excluded.lancamento_id,observacoes=excluded.observacoes RETURNING id INTO eid;
RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.energia_salvar(jsonb,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.energia_salvar(jsonb,boolean) TO authenticated;