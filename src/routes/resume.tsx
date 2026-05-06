import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Brain, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/resume")({
  component: ResumePage,
});

function ResumePage() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [savedResume, setSavedResume] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedResume(data);
          setResumeText((data.raw_text as string) || "");
          if (data.parsed_data && Object.keys(data.parsed_data as object).length > 0) {
            setParsedData(data.parsed_data as Record<string, unknown>);
          }
        }
      });
  }, [user]);

  const parseResume = async () => {
    if (!resumeText.trim()) {
      toast.error("Please paste your resume text");
      return;
    }
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: { action: "parse_resume", data: { resumeText } },
      });

      if (error) throw error;

      let parsed: Record<string, unknown>;
      try {
        const content = data.result as string;
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        toast.error("Failed to parse AI response");
        setParsing(false);
        return;
      }

      setParsedData(parsed);

      // Save to DB
      if (savedResume) {
        await supabase
          .from("resumes")
          .update({ raw_text: resumeText, parsed_data: parsed as unknown as Record<string, never> })
          .eq("id", savedResume.id as string);
      } else {
        const { data: newResume } = await supabase
          .from("resumes")
          .insert({ user_id: user.id, raw_text: resumeText, parsed_data: parsed as unknown as Record<string, never> })
          .select()
          .single();
        if (newResume) setSavedResume(newResume);
      }

      toast.success("Resume parsed successfully!");
    } catch (e) {
      toast.error("Failed to parse resume");
    }
    setParsing(false);
  };

  const analyzeAgainstJobs = async () => {
    if (!parsedData) {
      toast.error("Parse your resume first");
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: {
          action: "analyze_match",
          data: {
            resumeText,
            jobDescription: "Looking for a Data Engineer with 1-2 years of experience. Required skills: SQL, Python, Apache Spark, Airflow, AWS/GCP, ETL pipelines, data warehousing, PostgreSQL.",
            jobTitle: "Data Engineer",
          },
        },
      });

      if (error) throw error;

      const content = data.result as string;
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      setAnalysisResult(JSON.parse(cleaned));
      toast.success("Analysis complete!");
    } catch {
      toast.error("Analysis failed");
    }
    setAnalyzing(false);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-bold">Sign in to upload your resume</h2>
        <p className="mt-2 text-muted-foreground">Get AI-powered resume analysis and skill gap insights.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Resume Analysis</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste your resume text and let AI parse your skills, experience, and match you to jobs.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" /> Paste Resume
          </CardTitle>
          <CardDescription>Paste your resume content below</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <div className="mt-4 flex gap-3">
            <Button onClick={parseResume} disabled={parsing} className="gap-2">
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {parsing ? "Parsing..." : "Parse Resume"}
            </Button>
            {parsedData && (
              <Button onClick={analyzeAgainstJobs} disabled={analyzing} variant="outline" className="gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {analyzing ? "Analyzing..." : "Analyze Match"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Data */}
      {parsedData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Parsed Resume Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedData.summary && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Summary</h4>
                <p className="text-sm">{parsedData.summary as string}</p>
              </div>
            )}
            {Array.isArray(parsedData.skills) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(parsedData.skills as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(parsedData.experience) && (parsedData.experience as Array<Record<string, string>>).length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Experience</h4>
                {(parsedData.experience as Array<Record<string, string>>).map((exp, i) => (
                  <div key={i} className="mb-2 text-sm">
                    <span className="font-medium">{exp.role}</span> at {exp.company}
                    {exp.duration && <span className="text-muted-foreground"> • {exp.duration}</span>}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(parsedData.education) && (parsedData.education as Array<Record<string, string>>).length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Education</h4>
                {(parsedData.education as Array<Record<string, string>>).map((edu, i) => (
                  <div key={i} className="mb-1 text-sm">
                    {edu.degree} — {edu.institution} {edu.year && `(${edu.year})`}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Match Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Match Score</span>
                <span className="text-2xl font-bold text-primary">{analysisResult.matchScore as number}%</span>
              </div>
              <Progress value={analysisResult.matchScore as number} />
            </div>
            {Array.isArray(analysisResult.matchingSkills) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Matching Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(analysisResult.matchingSkills as string[]).map((s) => (
                    <Badge key={s} className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(analysisResult.missingSkills) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Missing Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(analysisResult.missingSkills as string[]).map((s) => (
                    <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {analysisResult.summary && (
              <p className="text-sm text-muted-foreground">{analysisResult.summary as string}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
