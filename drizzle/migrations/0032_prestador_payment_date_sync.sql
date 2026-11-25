CREATE OR REPLACE FUNCTION public.prestador_proteger_saida() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE lancamento_id=OLD.id) THEN
 IF NEW.valor IS DISTINCT FROM OLD.valor OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.situacao IS DISTINCT FROM OLD.situacao THEN
  RAISE EXCEPTION 'Este lançamento está vinculado ao pagamento de um prestador. Apenas a data e a conta podem ser corrigidas sem alterar o pagamento.';
 END IF;
 IF NEW.data_lancamento IS DISTINCT FROM OLD.data_lancamento AND NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento AND NEW.data_lancamento IS DISTINCT FROM NEW.data_pagamento THEN
  RAISE EXCEPTION 'Informe a mesma data para o lançamento e o pagamento do prestador.';
 END IF;
 IF NEW.data_lancamento IS DISTINCT FROM OLD.data_lancamento THEN
  NEW.data_pagamento:=NEW.data_lancamento;
 ELSIF NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento THEN
  NEW.data_lancamento:=NEW.data_pagamento;
 END IF;
 IF NEW.data_lancamento IS NULL OR NEW.data_pagamento IS NULL THEN
  RAISE EXCEPTION 'Informe a data do pagamento do prestador.';
 END IF;
 NEW.mes:=to_char(NEW.data_lancamento,'YYYY-MM');
END IF;
RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.prestador_sync_data_pagamento() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.prestador_pagamentos SET data_pagamento=NEW.data_pagamento
 WHERE lancamento_id=NEW.id AND data_pagamento IS DISTINCT FROM NEW.data_pagamento;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.prestador_sync_data_pagamento() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER prestador_sync_data_pagamento AFTER UPDATE OF data_lancamento,data_pagamento ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.prestador_sync_data_pagamento();