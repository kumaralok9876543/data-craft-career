
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS skills_extracted text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_bucket text DEFAULT 'Not specified';
