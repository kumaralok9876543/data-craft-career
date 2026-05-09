import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Loader2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { fetchJobsFromLinkedIn, repairExistingJobs } from "@/server/jobs.functions";
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
  experience_bucket: string | null;
  salary: string | null;
  posted_date: string | null;
  source: string;
  apply_link: string | null;
  source_url: string | null;
  description: string | null;
  skills_extracted: string[] | null;
  work_mode: string | null;
  created_at: string;
}

const EXPERIENCE_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "0-1 years", label: "0-1 years" },
  { value: "1-2 years", label: "1-2 years", recommended: true },
  { value: "3-4 years", label: "3-4 years" },
  { value: "5-8 years", label: "5-8 years" },
  { value: "8+ years", label: "8+ years" },
  { value: "Not specified", label: "Not specified" },
];

const SKILL_CHIPS = [
  "Python", "SQL", "Spark", "Airflow", "Kafka", "Snowflake",
  "AWS", "Azure", "GCP", "Databricks", "dbt", "ETL",
  "Docker", "Kubernetes", "Hadoop", "BigQuery", "Redshift",
  "Scala", "Java", "PostgreSQL",
];

const WORK_MODES = ["all", "Remote", "Hybrid", "On-site", "Not specified"];

function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("1-2 years");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [hideApplied, setHideApplied] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalDataEngineerJobs, setTotalDataEngineerJobs] = useState(0);
  const [totalScrapedJobs, setTotalScrapedJobs] = useState(0);

  const fetchJobsFn = useServerFn(fetchJobsFromLinkedIn);
  const repairJobsFn = useServerFn(repairExistingJobs);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .ilike("title", "%data%engineer%")
      .order("created_at", { ascending: false })
      .limit(500);

    if (search) {
      query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
    }
    if (locationFilter !== "all") {
      query = query.ilike("location", `%${locationFilter}%`);
    }
    if (experienceFilter !== "all") {
      query = query.eq("experience_bucket", experienceFilter);
    }
    if (workModeFilter !== "all") {
      query = query.eq("work_mode", workModeFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load jobs");
      setLoading(false);
      return;
    }

    let filtered = data || [];

    if (selectedSkills.size > 0) {
      filtered = filtered.filter((job) => {
        const jobSkills = (job.skills_extracted as string[] | null) || [];
        return Array.from(selectedSkills).some((s) =>
          jobSkills.some((js) => js.toLowerCase() === s.toLowerCase())
        );
      });
    }

    if (hideApplied && appliedIds.size > 0) {
      filtered = filtered.filter((job) => !appliedIds.has(job.id));
    }

    setJobs(filtered);
    setTotalJobs(filtered.length);

    const [{ count: deCount }, { count: scrapedCount }] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).ilike("title", "%data%engineer%"),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
    ]);
    setTotalDataEngineerJobs(deCount || 0);
    setTotalScrapedJobs(scrapedCount || 0);
    setLoading(false);
  }, [search, locationFilter, experienceFilter, workModeFilter, selectedSkills, hideApplied, appliedIds]);

  const loadAppliedAndBookmarks = useCallback(async () => {
    if (!user) return;
    const [bm, ap] = await Promise.all([
      supabase.from("bookmarks").select("job_id").eq("user_id", user.id),
      supabase.from("applied_jobs").select("job_id").eq("user_id", user.id),
    ]);
    if (bm.data) setBookmarkedIds(new Set(bm.data.map((b) => b.job_id)));
    if (ap.data) setAppliedIds(new Set(ap.data.map((a) => a.job_id)));
  }, [user]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadAppliedAndBookmarks(); }, [loadAppliedAndBookmarks]);

  const handleFetchNew = async () => {
    setFetching(true);
    try {
      const result = await fetchJobsFn({ data: { keyword: "Data Engineer", location: "India", limit: 200 } });
      toast.success(result.message);
      loadJobs();
    } catch {
      toast.error("Failed to fetch new jobs. Please try again.");
    }
    setFetching(false);
  };

  const handleRepairJobs = async () => {
    setRepairing(true);
    try {
      const result = await repairJobsFn();
      toast.success(result.message);
      loadJobs();
    } catch {
      toast.error("Failed to repair jobs. Please try again.");
    }
    setRepairing(false);
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

  const toggleApplied = async (jobId: string) => {
    if (!user) {
      toast.error("Sign in to track applied jobs");
      return;
    }
    if (appliedIds.has(jobId)) {
      await supabase.from("applied_jobs").delete().eq("user_id", user.id).eq("job_id", jobId);
      setAppliedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      toast.success("Unmarked as applied");
    } else {
      await supabase.from("applied_jobs").insert({ user_id: user.id, job_id: jobId });
      setAppliedIds((prev) => new Set(prev).add(jobId));
      toast.success("Marked as applied — moved to Applied tab");
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const clearSkills = () => setSelectedSkills(new Set());

  const locations = ["all", "Bangalore", "Mumbai", "Hyderabad", "Pune", "Delhi", "Chennai", "Noida", "Gurgaon", "Remote"];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Engineering Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalJobs} matching jobs
            {` • ${totalDataEngineerJobs} Data Engineer jobs`}
            {` • ${totalScrapedJobs} total scraped`}
            {experienceFilter !== "all" && ` • ${experienceFilter}`}
            {workModeFilter !== "all" && ` • ${workModeFilter}`}
            {selectedSkills.size > 0 && ` • ${selectedSkills.size} skill${selectedSkills.size > 1 ? "s" : ""}`}
            {hideApplied && appliedIds.size > 0 && ` • ${appliedIds.size} applied hidden`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRepairJobs} disabled={repairing} variant="outline" className="gap-2" title="Re-fetch job details and fix experience levels">
            {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {repairing ? "Repairing..." : "Fix Experience"}
          </Button>
          <Button onClick={handleFetchNew} disabled={fetching} variant="outline" className="gap-2">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {fetching ? "Fetching..." : "Fetch New Jobs"}
          </Button>
        </div>
      </div>

      {/* Filters Row 1: Search + Location + Experience */}
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
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
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
        <Select value={experienceFilter} onValueChange={setExperienceFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <span className="flex items-center gap-1.5">
                  {level.label}
                  {level.recommended && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={workModeFilter} onValueChange={setWorkModeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Work mode" />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode === "all" ? "All Work Modes" : mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters Row 2: Skill chips */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground">Filter by skills:</span>
          {selectedSkills.size > 0 && (
            <Button variant="ghost" size="sm" className="h-5 text-xs px-1.5 gap-1" onClick={clearSkills}>
              Clear <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_CHIPS.map((skill) => (
            <Badge
              key={skill}
              variant={selectedSkills.has(skill) ? "default" : "outline"}
              className="cursor-pointer text-xs transition-colors hover:bg-primary/10"
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>
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
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or fetching new jobs.</p>
            <Button onClick={handleFetchNew} className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" />
              Fetch Jobs from LinkedIn
            </Button>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={{
                ...job,
                skills: job.skills_extracted || [],
              }}
              isBookmarked={bookmarkedIds.has(job.id)}
              onToggleBookmark={toggleBookmark}
              isApplied={appliedIds.has(job.id)}
              onToggleApplied={toggleApplied}
            />
          ))
        )}
      </div>
    </div>
  );
}
