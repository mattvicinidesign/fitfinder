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
import { ResumeFilePicker } from "@/components/resume-file-picker";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function AnalyzePage() {
  const [resumeText, setResumeText] = useState("");
  const [resumeId, setResumeId] = useState<string | undefined>();
  const [jobText, setJobText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

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
        parsedResume = (await parseResume(resumeText, resumeId)).parsedResume;
      }

      setStatus("Scoring fit…");
      const { analysisId, result } = await analyze({
        jobText,
        companyName: companyName.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        resumeId,
        parsedResume,
      });

      setResult(result);
      setLastAnalysisId(analysisId);
      toast.success("Analysis complete and saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <PageHeader
        title="Analyze a job"
        description="Upload or paste your resume and a job description. All scoring runs on the shared backend."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>
              Resume improves accuracy. Upload from Files or paste text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={run} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
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
                <Label>Resume</Label>
                <ResumeFilePicker
                  disabled={busy}
                  onParsed={({ resumeId, resumeText }) => {
                    setResumeId(resumeId);
                    setResumeText(resumeText);
                  }}
                />
                <Textarea
                  id="resume"
                  rows={6}
                  placeholder="Or paste resume text…"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Job description</Label>
                <Textarea
                  id="job"
                  rows={6}
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
            <AnalysisResultView
              result={result}
              analysisId={lastAnalysisId}
            />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {busy ? status : "Your results will appear here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
