DO $$ BEGIN
  CREATE TYPE public.specialty AS ENUM (
    'fonoaudiologo','terapeuta_ocupacional','fisioterapeuta',
    'psicologo','musicoterapeuta','nutricionista','psicopedagogo','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty public.specialty;

CREATE INDEX IF NOT EXISTS idx_sessions_owner_date ON public.sessions(owner_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by_date ON public.sessions(created_by, session_date);