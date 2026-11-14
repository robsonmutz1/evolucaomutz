DO $migration$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.crm_validar_lead()'::regprocedure) INTO definition;
definition := replace(definition, 'OR public.crm_chave_telefone(a."telefoneResponsavel") = public.crm_chave_telefone(NEW.telefone)', 'OR public.crm_chave_telefone(a."telefoneResponsavel") = public.crm_chave_telefone(NEW.telefone) OR public.crm_chave_telefone(a.telefone_outro_responsavel) = public.crm_chave_telefone(NEW.telefone)');
IF position('a.telefone_outro_responsavel' in definition)=0 THEN RAISE EXCEPTION 'Phone validation anchor missing'; END IF;
EXECUTE definition;
END $migration$;