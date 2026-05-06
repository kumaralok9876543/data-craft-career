import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("bookmarks")
      .select("job_id, jobs(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setJobs(data.map((b) => b.jobs as Record<string, unknown>).filter(Boolean));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const removeBookmark = async (jobId: string) => {
    if (!user) return;
    await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("job_id", jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Star className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-bold">Sign in to view bookmarks</h2>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Saved Jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">{jobs.length} bookmarked jobs</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Star className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Saved Jobs</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bookmark jobs from the dashboard to save them here.
              </p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id as string}
              job={{
                id: job.id as string,
                title: job.title as string,
                company_name: job.company_name as string,
                location: job.location as string,
                experience_required: job.experience_required as string | null,
                salary: job.salary as string | null,
                posted_date: job.posted_date as string | null,
                source: job.source as string,
                apply_link: job.apply_link as string | null,
              }}
              isBookmarked
              onToggleBookmark={removeBookmark}
            />
          ))
        )}
      </div>
    </div>
  );
}
