ALTER TABLE public.faturamento_mensal ADD COLUMN entradas_base numeric(14,2);
UPDATE public.faturamento_mensal f SET entradas_base = coalesce((SELECT sum(l.valor) FROM public.lancamentos l WHERE l.tipo='entrada' AND l.situacao='realizado' AND l.transferencia_id IS NULL AND to_char(coalesce(l.data_pagamento,l.data_lancamento,(l.mes||'-01')::date),'YYYY-MM')=f.mes),0);
CREATE FUNCTION public.faturamento_listar() RETURNS TABLE(mes text,valor_registrado numeric,entradas_base numeric,entradas_atual numeric) LANGUAGE sql STABLE SET search_path=public SECURITY INVOKER AS $$
WITH entradas AS (SELECT to_char(coalesce(l.data_pagamento,l.data_lancamento,(l.mes||'-01')::date),'YYYY-MM') AS mes, sum(CASE WHEN l.situacao='realizado' THEN l.valor ELSE 0 END) AS valor FROM public.lancamentos l WHERE l.tipo='entrada' AND l.transferencia_id IS NULL AND public.has_owner_access() GROUP BY 1)
SELECT coalesce(f.mes,e.mes),f.valor,f.entradas_base,coalesce(e.valor,0) FROM public.faturamento_mensal f FULL JOIN entradas e ON e.mes=f.mes WHERE public.has_owner_access() ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.faturamento_listar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.faturamento_listar() TO authenticated;
CREATE FUNCTION public.faturamento_salvar(p_mes text,p_valor numeric,p_anterior text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path=public SECURITY INVOKER AS $$
DECLARE base numeric;
BEGIN
IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
IF p_mes IS NULL OR p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' OR p_valor IS NULL OR p_valor<0 OR p_valor::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Informe mês e valor válidos.'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('caixa:'||auth.uid()::text,0));
SELECT coalesce(sum(l.valor),0) INTO base FROM public.lancamentos l WHERE l.tipo='entrada' AND l.situacao='realizado' AND l.transferencia_id IS NULL AND to_char(coalesce(l.data_pagamento,l.data_lancamento,(l.mes||'-01')::date),'YYYY-MM')=p_mes;
IF p_anterior IS NOT NULL AND p_anterior<>p_mes THEN DELETE FROM public.faturamento_mensal WHERE mes=p_anterior; END IF;
INSERT INTO public.faturamento_mensal(mes,valor,entradas_base) VALUES(p_mes,round(p_valor,2),base) ON CONFLICT(mes) DO UPDATE SET valor=excluded.valor,entradas_base=excluded.entradas_base;
END;
$$;
REVOKE ALL ON FUNCTION public.faturamento_salvar(text,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.faturamento_salvar(text,numeric,text) TO authenticated;