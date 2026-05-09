import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/applied")({
  component: AppliedPage,
});

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  experience_required: string | null;
  experience_bucket: string | null;
  salary: string | null;
  posted_date: string | null;
  source: string;
  apply_link: string | null;
  source_url: string | null;
  description: string | null;
  skills_extracted: string[] | null;
  applied_at?: string;
}

function AppliedPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("applied_jobs")
      .select("applied_at, jobs:job_id(*)")
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applied jobs");
      setLoading(false);
      return;
    }
    const flat = (data || [])
      .map((row) => row.jobs ? { ...(row.jobs as unknown as Job), applied_at: row.applied_at } : null)
      .filter(Boolean) as Job[];
    setJobs(flat);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const removeApplied = async (jobId: string) => {
    if (!user) return;
    await supabase.from("applied_jobs").delete().eq("user_id", user.id).eq("job_id", jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    toast.success("Removed from Applied");
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Please sign in to view your applied jobs.</p>
        <Link to="/login"><Button className="mt-4">Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Applied Jobs</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{jobs.length} jobs you've applied to</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">No applied jobs yet</p>
            <p className="text-sm text-muted-foreground mt-1">Mark jobs as applied from the dashboard to track them here.</p>
            <Link to="/dashboard"><Button className="mt-4">Browse Jobs</Button></Link>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={{ ...job, skills: job.skills_extracted || [] }}
              isApplied
              onToggleApplied={removeApplied}
            />
          ))
        )}
      </div>
    </div>
  );
}
