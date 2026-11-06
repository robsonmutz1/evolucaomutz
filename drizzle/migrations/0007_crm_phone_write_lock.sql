CREATE OR REPLACE FUNCTION public.crm_lock_phone_writes() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(7264631101::bigint);
 RETURN NEW;
END $$;
CREATE TRIGGER aaa_crm_lock_lead BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_lock_phone_writes();
CREATE TRIGGER aaa_crm_lock_student BEFORE INSERT OR UPDATE OF telefone, "telefoneResponsavel" ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.crm_lock_phone_writes();
REVOKE ALL ON FUNCTION public.crm_lock_phone_writes() FROM PUBLIC, anon, authenticated;