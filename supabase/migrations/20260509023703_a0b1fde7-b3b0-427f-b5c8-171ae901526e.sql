CREATE TABLE public.applied_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.applied_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applied jobs"
  ON public.applied_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applied jobs"
  ON public.applied_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own applied jobs"
  ON public.applied_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_applied_jobs_user ON public.applied_jobs(user_id);