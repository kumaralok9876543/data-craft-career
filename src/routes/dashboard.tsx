import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJobsFromLinkedIn } from "@/server/jobs.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  experience_required: string | null;
  salary: string | null;
  posted_date: string | null;
  source: string;
  apply_link: string | null;
  source_url: string | null;
  description: string | null;
  created_at: string;
}

function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [totalJobs, setTotalJobs] = useState(0);

  const fetchJobsFn = useServerFn(fetchJobsFromLinkedIn);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .ilike("title", "%data engineer%")
      .order("created_at", { ascending: false })
      .limit(500);

    if (search) {
      query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
    }
    if (location !== "all") {
      query = query.ilike("location", `%${location}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load jobs");
    } else {
      setJobs(data || []);
      setTotalJobs(data?.length || 0);
    }
    setLoading(false);
  }, [search, location]);

  const loadBookmarks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookmarks")
      .select("job_id")
      .eq("user_id", user.id);
    if (data) {
      setBookmarkedIds(new Set(data.map((b) => b.job_id)));
    }
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleFetchNew = async () => {
    setFetching(true);
    try {
      const result = await fetchJobsFn({ data: { keyword: "Data Engineer", location: "India", limit: 150 } });
      toast.success(result.message);
      loadJobs();
    } catch {
      toast.error("Failed to fetch new jobs");
    }
    setFetching(false);
  };

  const toggleBookmark = async (jobId: string) => {
    if (!user) {
      toast.error("Sign in to bookmark jobs");
      return;
    }
    if (bookmarkedIds.has(jobId)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("job_id", jobId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, job_id: jobId });
      setBookmarkedIds((prev) => new Set(prev).add(jobId));
    }
  };

  const locations = ["all", "Bangalore", "Mumbai", "Hyderabad", "Pune", "Delhi", "Chennai", "Remote"];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Engineering Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalJobs} Data Engineer jobs found • Entry-level roles in India
          </p>
        </div>
        <Button onClick={handleFetchNew} disabled={fetching} variant="outline" className="gap-2">
          {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Fetch New Jobs
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc === "all" ? "All Locations" : loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobs */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">Try fetching new jobs or adjusting your filters.</p>
            <Button onClick={handleFetchNew} className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" />
              Fetch Jobs from LinkedIn
            </Button>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isBookmarked={bookmarkedIds.has(job.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>
    </div>
  );
}
