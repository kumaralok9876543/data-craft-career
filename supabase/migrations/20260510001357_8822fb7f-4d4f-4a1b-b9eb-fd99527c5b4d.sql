CREATE TABLE public.applicant_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, email TEXT, phone TEXT,
  linkedin_url TEXT, github_url TEXT, portfolio_url TEXT,
  current_salary TEXT, expected_salary TEXT, notice_period TEXT,
  work_authorization TEXT, preferred_job_types TEXT[],
  skills TEXT[], experience_years NUMERIC,
  education JSONB, experience JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applicant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile all" ON public.applicant_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.auto_apply_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  preferred_roles TEXT[] DEFAULT ARRAY['Data Engineer'],
  preferred_locations TEXT[] DEFAULT ARRAY['India'],
  work_modes TEXT[] DEFAULT ARRAY['Remote','Hybrid','On-site'],
  min_salary INTEGER,
  experience_buckets TEXT[] DEFAULT ARRAY['1-2 years'],
  daily_limit INTEGER NOT NULL DEFAULT 20,
  min_ats_score INTEGER NOT NULL DEFAULT 70,
  blacklisted_companies TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  ai_autoanswer BOOLEAN NOT NULL DEFAULT true,
  otp_autofill BOOLEAN NOT NULL DEFAULT false,
  gmail_connected BOOLEAN NOT NULL DEFAULT false,
  linkedin_connected BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_apply_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings all" ON public.auto_apply_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TYPE public.aa_status AS ENUM ('pending','claimed','running','succeeded','failed','skipped','needs_human');

CREATE TABLE public.auto_apply_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  apply_url TEXT, ats_platform TEXT,
  status public.aa_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  claimed_by TEXT, claimed_at TIMESTAMPTZ, lease_expires_at TIMESTAMPTZ,
  result JSONB, error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
ALTER TABLE public.auto_apply_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own queue all" ON public.auto_apply_queue FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_aa_queue_user_status ON public.auto_apply_queue(user_id, status, created_at DESC);
CREATE INDEX idx_aa_queue_pending ON public.auto_apply_queue(status, created_at) WHERE status = 'pending';

CREATE TABLE public.application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.auto_apply_queue(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  step TEXT, message TEXT, data JSONB, screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.application_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.application_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_logs_queue ON public.application_logs(queue_id, created_at DESC);

CREATE TABLE public.worker_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens all" ON public.worker_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_worker_tokens_hash ON public.worker_tokens(token_hash) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.applicant_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.auto_apply_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_queue_updated BEFORE UPDATE ON public.auto_apply_queue FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();