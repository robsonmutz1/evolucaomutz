CREATE TABLE public.prestador_historico (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prestador_id uuid NOT NULL REFERENCES public.prestadores(id), mes text NOT NULL, horas numeric, valor numeric, horas_conferidas numeric, origem text NOT NULL, UNIQUE(prestador_id,mes,origem));
GRANT SELECT ON public.prestador_historico TO authenticated; GRANT ALL ON public.prestador_historico TO service_role;
ALTER TABLE public.prestador_historico ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner reads provider archive" ON public.prestador_historico FOR SELECT TO authenticated USING(public.has_owner_access());
CREATE OR REPLACE FUNCTION public.prestador_proteger_saida() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF EXISTS(SELECT 1 FROM public.prestador_pagamentos WHERE lancamento_id=OLD.id) AND (NEW.valor IS DISTINCT FROM OLD.valor OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.data_lancamento IS DISTINCT FROM OLD.data_lancamento OR NEW.mes IS DISTINCT FROM OLD.mes) THEN RAISE EXCEPTION 'Este lançamento está vinculado ao pagamento de um prestador e não pode ser alterado.'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER prestador_proteger_saida BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.prestador_proteger_saida();