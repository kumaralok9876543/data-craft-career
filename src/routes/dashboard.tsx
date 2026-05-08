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
  experience_bucket: string | null;
  salary: string | null;
  posted_date: string | null;
  source: string;
  apply_link: string | null;
  source_url: string | null;
  description: string | null;
  skills_extracted: string[] | null;
  created_at: string;
}

const EXPERIENCE_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "0-1 years", label: "0-1 years" },
  { value: "1-2 years", label: "1-2 years", recommended: true },
  { value: "3-4 years", label: "3-4 years" },
  { value: "5-8 years", label: "5-8 years" },
  { value: "8+ years", label: "8+ years" },
];

const SKILL_CHIPS = [
  "Python", "SQL", "Spark", "Airflow", "Kafka", "Snowflake",
  "AWS", "Azure", "GCP", "Databricks", "dbt", "ETL",
  "Docker", "Kubernetes", "Hadoop", "BigQuery", "Redshift",
  "Scala", "Java", "PostgreSQL",
];

function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("1-2 years");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [totalJobs, setTotalJobs] = useState(0);

  const fetchJobsFn = useServerFn(fetchJobsFromLinkedIn);

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

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to load jobs");
      setLoading(false);
      return;
    }

    let filtered = data || [];

    // Client-side skill filter
    if (selectedSkills.size > 0) {
      filtered = filtered.filter((job) => {
        const jobSkills = (job.skills_extracted as string[] | null) || [];
        return Array.from(selectedSkills).some((s) =>
          jobSkills.some((js) => js.toLowerCase() === s.toLowerCase())
        );
      });
    }

    setJobs(filtered);
    setTotalJobs(selectedSkills.size > 0 ? filtered.length : (count ?? filtered.length));
    setLoading(false);
  }, [search, locationFilter, experienceFilter, selectedSkills]);

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
      const result = await fetchJobsFn({ data: { keyword: "Data Engineer", location: "India", limit: 200 } });
      toast.success(result.message);
      loadJobs();
    } catch {
      toast.error("Failed to fetch new jobs. Please try again.");
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
            {totalJobs} jobs found
            {experienceFilter !== "all" && ` • ${experienceFilter} experience`}
            {selectedSkills.size > 0 && ` • ${selectedSkills.size} skill${selectedSkills.size > 1 ? "s" : ""} selected`}
          </p>
        </div>
        <Button onClick={handleFetchNew} disabled={fetching} variant="outline" className="gap-2">
          {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {fetching ? "Fetching..." : "Fetch New Jobs"}
        </Button>
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
            />
          ))
        )}
      </div>
    </div>
  );
}
