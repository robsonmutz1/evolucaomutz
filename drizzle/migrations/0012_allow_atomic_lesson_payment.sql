CREATE OR REPLACE FUNCTION public.prestador_proteger_aula() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE pid uuid;
BEGIN
pid:=CASE WHEN TG_OP='DELETE' THEN OLD.prestador_id ELSE NEW.prestador_id END;
PERFORM pg_advisory_xact_lock(hashtext('prestador:'||pid::text));
IF TG_OP<>'INSERT' AND OLD.pagamento_id IS NOT NULL THEN RAISE EXCEPTION 'Aulas pagas não podem ser alteradas.'; END IF;
IF TG_OP='DELETE' THEN RETURN OLD; END IF;
IF TG_OP='UPDATE' AND OLD.prestador_id<>NEW.prestador_id THEN PERFORM pg_advisory_xact_lock(hashtext('prestador:'||OLD.prestador_id::text)); END IF;
IF NEW.pagamento_id IS NOT NULL THEN
IF TG_OP<>'UPDATE' OR NEW.prestador_id<>OLD.prestador_id OR NEW.data<>OLD.data OR NEW.horas<>OLD.horas OR NEW.valor_hora<>OLD.valor_hora OR NEW.descricao<>OLD.descricao OR NOT EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE id=NEW.pagamento_id AND prestador_id=pid AND mes=to_char(NEW.data,'YYYY-MM')) THEN RAISE EXCEPTION 'Pagamento inválido.'; END IF;
ELSE
IF EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE prestador_id=pid AND mes=to_char(NEW.data,'YYYY-MM')) THEN RAISE EXCEPTION 'Este mês já foi pago.'; END IF;
END IF;
RETURN NEW;
END $$;