import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Bookmark, BookmarkCheck, ExternalLink, CheckCircle2, Circle } from "lucide-react";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company_name: string;
    location: string;
    experience_required?: string | null;
    experience_bucket?: string | null;
    salary?: string | null;
    posted_date?: string | null;
    source: string;
    apply_link?: string | null;
    work_mode?: string | null;
    skills?: string[];
  };
  isBookmarked?: boolean;
  onToggleBookmark?: (jobId: string) => void;
  matchScore?: number | null;
  isApplied?: boolean;
  onToggleApplied?: (jobId: string) => void;
}

export function JobCard({ job, isBookmarked, onToggleBookmark, matchScore, isApplied, onToggleApplied }: JobCardProps) {
  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {job.title}
              </h3>
            </Link>
            <p className="mt-1 text-sm text-muted-foreground font-medium">{job.company_name}</p>
          </div>
          <div className="flex items-center gap-1">
            {matchScore !== undefined && matchScore !== null && (
              <Badge variant={matchScore > 70 ? "default" : "secondary"} className="text-xs">
                {matchScore}% match
              </Badge>
            )}
            {onToggleBookmark && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onToggleBookmark(job.id)}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
          {job.experience_bucket && (
            <Badge variant="outline" className="text-xs">
              {job.experience_bucket}
            </Badge>
          )}
          {job.experience_required && !job.experience_bucket && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {job.experience_required}
            </span>
          )}
          {job.salary && (
            <span className="font-medium text-foreground">{job.salary}</span>
          )}
          {job.work_mode && job.work_mode !== "Not specified" && (
            <Badge variant="secondary" className="text-xs">
              {job.work_mode}
            </Badge>
          )}
        </div>

        {job.skills && job.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs font-normal">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{job.skills.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground capitalize">{job.source}</span>
          <div className="flex items-center gap-2">
            {onToggleApplied && (
              <Button
                variant={isApplied ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 gap-1"
                onClick={() => onToggleApplied(job.id)}
              >
                {isApplied ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {isApplied ? "Applied" : "Mark Applied"}
              </Button>
            )}
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              <Button variant="outline" size="sm" className="text-xs h-8">
                Details
              </Button>
            </Link>
            {job.apply_link && (
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="text-xs h-8 gap-1">
                  Apply <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
