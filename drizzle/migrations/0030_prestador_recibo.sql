ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.prestador_pagamentos ADD COLUMN IF NOT EXISTS valor_aulas numeric, ADD COLUMN IF NOT EXISTS passagens_qtd integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS passagem_valor numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.prestador_pagamentos SET valor_aulas=valor WHERE valor_aulas IS NULL;
CREATE OR REPLACE FUNCTION public.prestador_pagar_completo(p_prestador uuid,p_mes text,p_data date,p_conta uuid,p_passagens integer,p_passagem_valor numeric,p_extras jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE aulas numeric; extras_total numeric:=0; total numeric; lid uuid; payid uuid; pname text; e jsonb;
BEGIN
IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
IF p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' OR p_data IS NULL THEN RAISE EXCEPTION 'Informe mês e data válidos.'; END IF;
IF coalesce(p_passagens,0)<0 OR coalesce(p_passagem_valor,0)<0 THEN RAISE EXCEPTION 'Passagens inválidas.'; END IF;
IF jsonb_typeof(coalesce(p_extras,'[]'))<>'array' THEN RAISE EXCEPTION 'Valores extras inválidos.'; END IF;
FOR e IN SELECT * FROM jsonb_array_elements(coalesce(p_extras,'[]')) LOOP
 IF (e->>'valor') IS NULL OR (e->>'valor')::numeric<0 THEN RAISE EXCEPTION 'Valor extra inválido.'; END IF;
 extras_total:=extras_total+round((e->>'valor')::numeric,2);
END LOOP;
PERFORM pg_advisory_xact_lock(hashtext('prestador:'||p_prestador::text));
SELECT id INTO payid FROM public.prestador_pagamentos WHERE prestador_id=p_prestador AND mes=p_mes;
IF payid IS NOT NULL THEN RETURN payid; END IF;
SELECT nome INTO pname FROM public.prestadores WHERE id=p_prestador;
SELECT sum(round(horas*valor_hora,2)) INTO aulas FROM public.prestador_aulas WHERE prestador_id=p_prestador AND to_char(data,'YYYY-MM')=p_mes AND pagamento_id IS NULL;
IF aulas IS NULL OR aulas<=0 THEN RAISE EXCEPTION 'Não há aulas a pagar.'; END IF;
total:=aulas+round(coalesce(p_passagens,0)*coalesce(p_passagem_valor,0),2)+extras_total;
INSERT INTO public.lancamentos(mes,data_lancamento,tipo,grupo,categoria,valor,descricao,origem,conta_id) VALUES(to_char(p_data,'YYYY-MM'),p_data,'saida','Despesas com pessoal','Salário Prestador de Serviço',total,pname||' · aulas de '||p_mes||CASE WHEN coalesce(p_passagens,0)>0 THEN ' + '||p_passagens||' passagens' ELSE '' END||CASE WHEN extras_total>0 THEN ' + extras' ELSE '' END,'prestadores',p_conta) RETURNING id INTO lid;
payid:=gen_random_uuid();
INSERT INTO public.prestador_pagamentos(id,prestador_id,mes,data_pagamento,valor,lancamento_id,valor_aulas,passagens_qtd,passagem_valor,extras) VALUES(payid,p_prestador,p_mes,p_data,total,lid,aulas,coalesce(p_passagens,0),coalesce(p_passagem_valor,0),coalesce(p_extras,'[]'));
UPDATE public.prestador_aulas SET pagamento_id=payid WHERE prestador_id=p_prestador AND to_char(data,'YYYY-MM')=p_mes AND pagamento_id IS NULL;
RETURN payid;
END $$;
REVOKE ALL ON FUNCTION public.prestador_pagar_completo(uuid,text,date,uuid,integer,numeric,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.prestador_pagar_completo(uuid,text,date,uuid,integer,numeric,jsonb) TO authenticated;