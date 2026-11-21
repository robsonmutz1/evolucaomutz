ALTER TABLE public.mensalidades ADD COLUMN extra_lote uuid;
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_extra_tipo CHECK (extra_lote IS NULL OR tipo = 'mensalidade');
CREATE UNIQUE INDEX mensalidades_mes_por_lote ON public.mensalidades (aluno_id, referencia, (coalesce(extra_lote,'00000000-0000-0000-0000-000000000000'::uuid))) WHERE tipo = 'mensalidade' AND situacao <> 'cancelada';
DROP INDEX public.mensalidades_mes_unico;
CREATE OR REPLACE FUNCTION public.mensalidades_adicionar_extras(p_aluno uuid, p_lote uuid, p_descricao text, p_parcelas jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r jsonb; n integer; descricao text;
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 IF p_lote IS NULL OR p_lote='00000000-0000-0000-0000-000000000000'::uuid THEN RAISE EXCEPTION 'Identificação inválida.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.alunos WHERE id=p_aluno) THEN RAISE EXCEPTION 'Aluno não encontrado.'; END IF;
 descricao:=trim(p_descricao);
 IF descricao IS NULL OR length(descricao)<1 OR length(descricao)>120 THEN RAISE EXCEPTION 'Informe o curso ou descrição das parcelas extras.'; END IF;
 IF p_parcelas IS NULL OR jsonb_typeof(p_parcelas)<>'array' THEN RAISE EXCEPTION 'Informe as parcelas extras.'; END IF;
 n:=jsonb_array_length(p_parcelas);
 IF n<1 OR n>60 THEN RAISE EXCEPTION 'Informe de 1 a 60 parcelas.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('extras:'||p_aluno::text||':'||p_lote::text,0));
 IF EXISTS(SELECT 1 FROM public.mensalidades WHERE aluno_id=p_aluno AND extra_lote=p_lote) THEN RETURN 0; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_parcelas) LOOP
  IF r->>'tipo' IS DISTINCT FROM 'mensalidade' OR (r->>'valor') IS NULL OR (r->>'valor')::numeric<=0 OR (r->>'valor')::numeric<>round((r->>'valor')::numeric,2) OR (r->>'vencimento') IS NULL OR (r->>'referencia') IS NULL OR (r->>'parcela') IS NULL OR (r->>'parcela')::integer<1 OR (r->>'parcela')::integer>60 THEN RAISE EXCEPTION 'Confira valores e vencimentos.'; END IF;
  INSERT INTO public.mensalidades(aluno_id,tipo,parcela,referencia,vencimento,valor,observacao,extra_lote)
  VALUES(p_aluno,'mensalidade',(r->>'parcela')::integer,r->>'referencia',(r->>'vencimento')::date,(r->>'valor')::numeric,'Curso extra: '||descricao,p_lote);
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.mensalidades_adicionar_extras(uuid,uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mensalidades_adicionar_extras(uuid,uuid,text,jsonb) TO authenticated, service_role;