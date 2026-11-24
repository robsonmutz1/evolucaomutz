CREATE OR REPLACE FUNCTION public.energia_sync_de_lancamento() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
UPDATE public.energia_registros SET valor=NEW.valor,
 data_pagamento=CASE WHEN data_pagamento IS NOT NULL THEN NEW.data_lancamento ELSE data_pagamento END
WHERE lancamento_id=NEW.id AND (valor IS DISTINCT FROM NEW.valor OR (data_pagamento IS NOT NULL AND data_pagamento IS DISTINCT FROM NEW.data_lancamento));
RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS energia_sync_de_lancamento ON public.lancamentos;
CREATE TRIGGER energia_sync_de_lancamento AFTER UPDATE OF valor,data_lancamento ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.energia_sync_de_lancamento();

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
IF oldlid IS NOT NULL THEN
IF v IS NULL OR v<=0 THEN RAISE EXCEPTION 'Este mês já tem saída no caixa: informe um valor maior que zero.'; END IF;
UPDATE public.lancamentos SET valor=v,
 data_lancamento=coalesce(dt,data_lancamento), mes=to_char(coalesce(dt,data_lancamento),'YYYY-MM')
WHERE id=oldlid AND (valor IS DISTINCT FROM v OR (dt IS NOT NULL AND data_lancamento IS DISTINCT FROM dt));
END IF;
INSERT INTO public.energia_registros(mes,medidor,consumo_kwh,valor,data_pagamento,lancamento_id,observacoes) VALUES(m,NULLIF(p_row->>'medidor','')::numeric,NULLIF(p_row->>'consumo_kwh','')::numeric,v,dt,lid,coalesce(p_row->>'observacoes','')) ON CONFLICT(mes) DO UPDATE SET medidor=excluded.medidor,consumo_kwh=excluded.consumo_kwh,valor=excluded.valor,data_pagamento=excluded.data_pagamento,lancamento_id=excluded.lancamento_id,observacoes=excluded.observacoes RETURNING id INTO eid;
RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.energia_salvar(jsonb,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.energia_salvar(jsonb,boolean) TO authenticated;

UPDATE public.energia_registros e SET valor=l.valor FROM public.lancamentos l WHERE l.id=e.lancamento_id AND e.valor IS DISTINCT FROM l.valor;