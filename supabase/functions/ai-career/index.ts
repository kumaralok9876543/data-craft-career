import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "You are a helpful AI career assistant specializing in Data Engineering roles.";
    let userMessages = messages || [];

    if (action === "parse_resume") {
      systemPrompt = `You are an expert resume parser for Data Engineering roles. Extract structured information from the resume text.
Return a JSON object with:
- skills: array of technical skills found
- experience: array of {company, role, duration, description}
- education: array of {institution, degree, year}
- summary: brief professional summary
Only return valid JSON, no markdown.`;
      userMessages = [{ role: "user", content: `Parse this resume:\n\n${data.resumeText}` }];
    } else if (action === "analyze_match") {
      systemPrompt = `You are an expert job-resume match analyzer for Data Engineering roles.
Analyze the match between the resume and job description.
Return a JSON object with:
- matchScore: number 0-100
- matchingSkills: array of skills that match
- missingSkills: array of skills the candidate lacks
- suggestions: array of improvement suggestions
- summary: brief analysis paragraph
Only return valid JSON, no markdown.`;
      userMessages = [{ role: "user", content: `Resume:\n${data.resumeText}\n\nJob Description:\n${data.jobDescription}\n\nJob Title: ${data.jobTitle}` }];
    } else if (action === "study_plan") {
      systemPrompt = `You are an expert Data Engineering career coach.
Generate a detailed 30-day study plan for someone with ${data.experienceYears || 1} year(s) experience.
Focus on these skill gaps: ${(data.missingSkills || ["SQL", "Python", "Apache Spark", "Airflow", "Cloud (AWS/GCP)"]).join(", ")}.
Return a JSON object with:
- plan: array of {week: number, title: string, topics: array of {day: string, topic: string, resources: string, duration: string}}
- summary: brief overview of the plan
Only return valid JSON, no markdown.`;
      userMessages = [{ role: "user", content: "Generate my personalized 30-day Data Engineering study plan." }];
    } else if (action === "recommend") {
      systemPrompt = `You are a job recommendation engine for Data Engineering roles.
Given a user's profile and skills, rank the provided jobs by relevance.
Return a JSON array of objects with: {jobId, score (0-100), reasoning}
Only return valid JSON, no markdown.`;
      userMessages = [{
        role: "user",
        content: `User Profile:\nSkills: ${(data.userSkills || []).join(", ")}\nExperience: ${data.experienceYears || 1} years\nLocation: ${data.location || "India"}\n\nJobs to rank:\n${JSON.stringify(data.jobs || [])}`
      }];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...userMessages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
