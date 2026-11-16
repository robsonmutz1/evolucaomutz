ALTER TABLE public.leads ADD COLUMN data_visita timestamptz;
ALTER TABLE public.leads ADD COLUMN visita_status text CHECK (visita_status IN ('agendada','compareceu','reagendou','nao_respondeu'));
ALTER TABLE public.leads ADD COLUMN visita_reagendamentos integer NOT NULL DEFAULT 0 CHECK (visita_reagendamentos >= 0);
CREATE OR REPLACE FUNCTION public.crm_visita_controle() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.visita_reagendamentos := 0; ELSE NEW.visita_reagendamentos := OLD.visita_reagendamentos; END IF;
  IF NEW.data_visita IS NULL THEN NEW.visita_status := NULL; RETURN NEW; END IF;
  IF NEW.visita_status IS NULL THEN NEW.visita_status := 'agendada'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.data_visita IS NOT NULL AND NEW.data_visita IS DISTINCT FROM OLD.data_visita THEN
    NEW.visita_reagendamentos := OLD.visita_reagendamentos + 1;
    IF NEW.visita_status = OLD.visita_status AND NEW.visita_status IN ('agendada','nao_respondeu') THEN NEW.visita_status := 'reagendou'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER crm_visita_controle BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_visita_controle();