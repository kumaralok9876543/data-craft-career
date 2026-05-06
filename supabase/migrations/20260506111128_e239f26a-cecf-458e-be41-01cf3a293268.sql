
-- Fix: restrict service role policies to service_role
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role can manage skills" ON public.skills;
DROP POLICY IF EXISTS "Service role can manage job_skills" ON public.job_skills;

CREATE POLICY "Service role manages companies" ON public.companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages jobs" ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages skills" ON public.skills FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages job_skills" ON public.job_skills FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix: restrict handle_new_user function execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
