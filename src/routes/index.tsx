import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Brain, FileText, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Briefcase,
      title: "Smart Job Aggregation",
      description: "Data Engineering jobs from LinkedIn and more, curated for 1-2 years experience in India.",
    },
    {
      icon: Brain,
      title: "AI Resume Analysis",
      description: "Get instant match scores, identify skill gaps, and receive improvement suggestions.",
    },
    {
      icon: FileText,
      title: "Resume Parser",
      description: "AI extracts your skills, experience, and education automatically from your resume.",
    },
    {
      icon: BookOpen,
      title: "Study Plan Generator",
      description: "Personalized 30-day roadmap covering SQL, Python, Spark, Airflow, and Cloud.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-6 text-xs font-medium px-3 py-1">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Career Assistant
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Land Your Next{" "}
            <span className="text-primary">Data Engineering</span>{" "}
            Role
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Aggregate jobs, analyze your resume, identify skill gaps, and get a personalized study plan — all powered by AI.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 text-base px-8">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="lg" className="gap-2 text-base px-8">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="lg" className="text-base px-8">
                    Browse Jobs
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Everything You Need to Accelerate Your Career
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          From job discovery to skill development — one platform for aspiring Data Engineers.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.title} className="transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>DataEng Jobs — AI-Powered Career Assistant for Data Engineers in India</p>
          <p className="mt-1">Built with Lovable</p>
        </div>
      </footer>
    </div>
  );
}
