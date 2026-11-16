ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_origem_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_origem_check CHECK (length(btrim(origem)) BETWEEN 1 AND 60);
ALTER TABLE public.leads ALTER COLUMN origem SET DEFAULT 'Indicação';