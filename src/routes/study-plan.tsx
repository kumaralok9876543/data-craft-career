import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/study-plan")({
  component: StudyPlanPage,
});

interface Topic {
  day: string;
  topic: string;
  resources: string;
  duration: string;
}

interface Week {
  week: number;
  title: string;
  topics: Topic[];
}

function StudyPlanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Week[] | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      // Get user's skill gaps from latest resume analysis
      let missingSkills: string[] = [];
      let experienceYears = 1;

      if (user) {
        const { data: resume } = await supabase
          .from("resumes")
          .select("parsed_data")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: profile } = await supabase
          .from("profiles")
          .select("experience_years")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.experience_years) experienceYears = profile.experience_years;

        // Extract skills from resume to find gaps
        if (resume?.parsed_data) {
          const parsed = resume.parsed_data as Record<string, unknown>;
          const userSkills = (parsed.skills as string[]) || [];
          const deSkills = ["SQL", "Python", "Apache Spark", "Airflow", "AWS", "GCP", "Docker", "Kafka", "PostgreSQL", "Data Warehousing", "ETL"];
          missingSkills = deSkills.filter(
            (s) => !userSkills.some((us) => us.toLowerCase().includes(s.toLowerCase()))
          );
        }
      }

      if (missingSkills.length === 0) {
        missingSkills = ["SQL", "Python", "Apache Spark", "Airflow", "Cloud (AWS/GCP)"];
      }

      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: {
          action: "study_plan",
          data: { missingSkills, experienceYears },
        },
      });

      if (error) throw error;

      const content = data.result as string;
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);

      setPlan(result.plan || []);
      setSummary(result.summary || "");
      toast.success("Study plan generated!");
    } catch {
      toast.error("Failed to generate study plan");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">30-Day Study Plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated roadmap for Data Engineering skills
          </p>
        </div>
        <Button onClick={generatePlan} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating..." : plan ? "Regenerate" : "Generate Plan"}
        </Button>
      </div>

      {!plan && !loading && (
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Study Plan Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Click "Generate Plan" to get a personalized 30-day roadmap. For better results, upload your resume first so we can identify your skill gaps.
            </p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <p className="text-sm">{summary}</p>
          </CardContent>
        </Card>
      )}

      {plan && plan.map((week) => (
        <Card key={week.week} className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary">Week {week.week}</Badge>
              {week.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {week.topics.map((topic, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <Badge variant="outline" className="shrink-0 h-6">{topic.day}</Badge>
                  <div className="flex-1">
                    <p className="font-medium">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{topic.resources}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{topic.duration}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
