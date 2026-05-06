import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, ExternalLink, ArrowLeft, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      setJob(data);
      setLoading(false);

      if (user && data) {
        const { data: bm } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", user.id)
          .eq("job_id", data.id)
          .maybeSingle();
        setBookmarked(!!bm);
      }
    };
    load();
  }, [jobId, user]);

  const toggleBookmark = async () => {
    if (!user || !job) {
      toast.error("Sign in to bookmark");
      return;
    }
    const jid = job.id as string;
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("job_id", jid);
      setBookmarked(false);
      toast.success("Removed from bookmarks");
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, job_id: jid });
      setBookmarked(true);
      toast.success("Bookmarked!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h2 className="text-2xl font-bold">Job not found</h2>
        <Link to="/dashboard">
          <Button className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{job.title as string}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{job.company_name as string}</p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleBookmark}>
              {bookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location as string}
            </span>
            {job.experience_required && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {String(job.experience_required)}
              </span>
            )}
            {job.salary && (
              <Badge variant="secondary">{String(job.salary)}</Badge>
            )}
            {job.posted_date && (
              <span>{String(job.posted_date)}</span>
            )}
          </div>

          <Separator className="my-6" />

          {job.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-3">Job Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{String(job.description)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No detailed description available. Click "Apply" to view the full listing.
            </p>
          )}

          <div className="mt-8 flex gap-3">
            {job.apply_link && (
              <a href={job.apply_link as string} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  Apply Now <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>

          <div className="mt-4 text-xs text-muted-foreground capitalize">
            Source: {job.source as string}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
