"use client";

import { useState } from "react";
import { analyze, parseResume } from "@/lib/api";
import type { AnalysisResult, ParsedResume } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisResultView } from "@/components/analysis-result";
import { toast } from "sonner";

export default function AnalyzePage() {
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const busy = status !== null;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!jobText.trim()) {
      toast.error("Paste a job description to analyze.");
      return;
    }
    setResult(null);
    try {
      let parsedResume: ParsedResume | undefined;
      if (resumeText.trim()) {
        setStatus("Parsing resume…");
        parsedResume = (await parseResume(resumeText)).parsedResume;
      }

      setStatus("Scoring fit…");
      const { result } = await analyze({
        jobText,
        companyName: companyName.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        parsedResume,
      });

      setResult(result);
      toast.success("Analysis complete and saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Analyze a job</h1>
      <p className="mt-1 text-muted-foreground">
        Paste your resume and a job description. Scoring runs on the shared
        backend, so results match the iOS app exactly.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>
              The resume is optional but greatly improves accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={run} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job title</Label>
                  <Input
                    id="title"
                    placeholder="Senior Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume">Resume text</Label>
                <Textarea
                  id="resume"
                  rows={8}
                  placeholder="Paste your resume…"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Job description</Label>
                <Textarea
                  id="job"
                  rows={8}
                  placeholder="Paste the job description…"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {status ?? "Analyze fit"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {result ? (
            <AnalysisResultView result={result} />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {busy ? status : "Your results will appear here."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
