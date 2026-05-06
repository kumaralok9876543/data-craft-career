import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsPage,
});

interface JobWithScore {
  id: string;
  title: string;
  company_name: string;
  location: string;
  experience_required: string | null;
  salary: string | null;
  posted_date: string | null;
  source: string;
  apply_link: string | null;
  description: string | null;
  matchScore?: number;
  reasoning?: string;
}

function RecommendationsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bookmarks")
      .select("job_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setBookmarkedIds(new Set(data.map((b) => b.job_id)));
      });
  }, [user]);

  const generateRecommendations = async () => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }

    setLoading(true);
    try {
      // Get user profile and resume
      const [{ data: profile }, { data: resume }, { data: allJobs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("resumes")
          .select("parsed_data")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("jobs").select("id, title, company_name, location, experience_required, salary, description").order("created_at", { ascending: false }).limit(20),
      ]);

      if (!allJobs || allJobs.length === 0) {
        toast.error("No jobs available. Fetch jobs first from the dashboard.");
        setLoading(false);
        return;
      }

      const userSkills = resume?.parsed_data
        ? ((resume.parsed_data as Record<string, unknown>).skills as string[]) || []
        : ["SQL", "Python"];

      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: {
          action: "recommend",
          data: {
            userSkills,
            experienceYears: profile?.experience_years || 1,
            location: profile?.location || "India",
            jobs: allJobs.map((j) => ({
              jobId: j.id,
              title: j.title,
              company: j.company_name,
              location: j.location,
              description: (j.description || "").slice(0, 200),
            })),
          },
        },
      });

      if (error) throw error;

      const content = data.result as string;
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const rankings = JSON.parse(cleaned) as Array<{ jobId: string; score: number; reasoning: string }>;

      // Merge scores with job data
      const jobMap = new Map(allJobs.map((j) => [j.id, j]));
      const ranked = rankings
        .filter((r) => jobMap.has(r.jobId))
        .sort((a, b) => b.score - a.score)
        .map((r) => ({
          ...jobMap.get(r.jobId)!,
          matchScore: r.score,
          reasoning: r.reasoning,
          posted_date: null,
          source: "linkedin",
          apply_link: null,
        })) as JobWithScore[];

      setJobs(ranked);
      toast.success("Recommendations generated!");
    } catch {
      toast.error("Failed to generate recommendations");
    }
    setLoading(false);
  };

  const toggleBookmark = async (jobId: string) => {
    if (!user) return;
    if (bookmarkedIds.has(jobId)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("job_id", jobId);
      setBookmarkedIds((prev) => { const n = new Set(prev); n.delete(jobId); return n; });
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, job_id: jobId });
      setBookmarkedIds((prev) => new Set(prev).add(jobId));
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Compass className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-bold">Sign in for recommendations</h2>
        <p className="mt-2 text-muted-foreground">Get AI-powered job matches based on your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Recommendations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Jobs matched to your profile and skills</p>
        </div>
        <Button onClick={generateRecommendations} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analyzing..." : "Get Recommendations"}
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {jobs.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Compass className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Recommendations Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Click "Get Recommendations" to have AI match jobs to your profile. Upload a resume first for better results.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id}>
              <JobCard
                job={job}
                isBookmarked={bookmarkedIds.has(job.id)}
                onToggleBookmark={toggleBookmark}
                matchScore={job.matchScore}
              />
              {job.reasoning && (
                <p className="ml-5 mt-1 text-xs text-muted-foreground italic">{job.reasoning}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
