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

interface ParsedResume {
  skills?: string[];
  experience?: Array<{ company: string; role: string; duration?: string }>;
  education?: Array<{ institution: string; degree: string; year?: string }>;
  summary?: string;
}

interface AnalysisResult {
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  suggestions?: string[];
  summary?: string;
}

function ResumePage() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("resumes").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setSavedResumeId(data.id);
        setResumeText(data.raw_text || "");
        if (data.parsed_data && typeof data.parsed_data === "object" && !Array.isArray(data.parsed_data)) {
          setParsedData(data.parsed_data as unknown as ParsedResume);
        }
      }
    });
  }, [user]);

  const parseResume = async () => {
    if (!resumeText.trim()) { toast.error("Please paste your resume text"); return; }
    if (!user) { toast.error("Please sign in first"); return; }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: { action: "parse_resume", data: { resumeText } },
      });
      if (error) throw error;
      const content = (data.result as string).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed: ParsedResume = JSON.parse(content);
      setParsedData(parsed);

      const jsonVal = parsed as unknown as Record<string, never>;
      if (savedResumeId) {
        await supabase.from("resumes").update({ raw_text: resumeText, parsed_data: jsonVal }).eq("id", savedResumeId);
      } else {
        const { data: nr } = await supabase.from("resumes").insert({ user_id: user.id, raw_text: resumeText, parsed_data: jsonVal }).select("id").single();
        if (nr) setSavedResumeId(nr.id);
      }
      toast.success("Resume parsed successfully!");
    } catch { toast.error("Failed to parse resume"); }
    setParsing(false);
  };

  const analyzeAgainstJobs = async () => {
    if (!parsedData) { toast.error("Parse your resume first"); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-career", {
        body: { action: "analyze_match", data: { resumeText, jobDescription: "Data Engineer with 1-2 years experience. Skills: SQL, Python, Spark, Airflow, AWS/GCP, ETL, PostgreSQL.", jobTitle: "Data Engineer" } },
      });
      if (error) throw error;
      const content = (data.result as string).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      setAnalysisResult(JSON.parse(content));
      toast.success("Analysis complete!");
    } catch { toast.error("Analysis failed"); }
    setAnalyzing(false);
  };

  if (!user) {
    return (<div className="mx-auto max-w-3xl px-4 py-12 text-center"><FileText className="mx-auto h-12 w-12 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">Sign in to upload your resume</h2></div>);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Resume Analysis</h1>
      <p className="mt-1 text-sm text-muted-foreground">Paste your resume text and let AI parse your skills and match you to jobs.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" /> Paste Resume</CardTitle><CardDescription>Paste your resume content below</CardDescription></CardHeader>
        <CardContent>
          <Textarea placeholder="Paste your resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={10} className="font-mono text-sm" />
          <div className="mt-4 flex gap-3">
            <Button onClick={parseResume} disabled={parsing} className="gap-2">{parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}{parsing ? "Parsing..." : "Parse Resume"}</Button>
            {parsedData && <Button onClick={analyzeAgainstJobs} disabled={analyzing} variant="outline" className="gap-2">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}{analyzing ? "Analyzing..." : "Analyze Match"}</Button>}
          </div>
        </CardContent>
      </Card>

      {parsedData && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Parsed Resume Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {parsedData.summary && <div><h4 className="font-medium text-sm text-muted-foreground mb-1">Summary</h4><p className="text-sm">{parsedData.summary}</p></div>}
            {parsedData.skills && parsedData.skills.length > 0 && (
              <div><h4 className="font-medium text-sm text-muted-foreground mb-2">Skills</h4><div className="flex flex-wrap gap-1.5">{parsedData.skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>
            )}
            {parsedData.experience && parsedData.experience.length > 0 && (
              <div><h4 className="font-medium text-sm text-muted-foreground mb-2">Experience</h4>{parsedData.experience.map((exp, i) => <div key={i} className="mb-2 text-sm"><span className="font-medium">{exp.role}</span> at {exp.company}{exp.duration && <span className="text-muted-foreground"> • {exp.duration}</span>}</div>)}</div>
            )}
            {parsedData.education && parsedData.education.length > 0 && (
              <div><h4 className="font-medium text-sm text-muted-foreground mb-2">Education</h4>{parsedData.education.map((edu, i) => <div key={i} className="mb-1 text-sm">{edu.degree} — {edu.institution} {edu.year && `(${edu.year})`}</div>)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Match Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysisResult.matchScore !== undefined && (
              <div><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Match Score</span><span className="text-2xl font-bold text-primary">{analysisResult.matchScore}%</span></div><Progress value={analysisResult.matchScore} /></div>
            )}
            {analysisResult.matchingSkills && analysisResult.matchingSkills.length > 0 && (
              <div><h4 className="font-medium text-sm text-muted-foreground mb-2">Matching Skills</h4><div className="flex flex-wrap gap-1.5">{analysisResult.matchingSkills.map((s) => <Badge key={s} className="text-xs">{s}</Badge>)}</div></div>
            )}
            {analysisResult.missingSkills && analysisResult.missingSkills.length > 0 && (
              <div><h4 className="font-medium text-sm text-muted-foreground mb-2">Missing Skills</h4><div className="flex flex-wrap gap-1.5">{analysisResult.missingSkills.map((s) => <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>)}</div></div>
            )}
            {analysisResult.summary && <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
