"use client";

import { useRef, useState } from "react";
import { FileUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAndParseResume } from "@/lib/resume-upload";
import { toast } from "sonner";

interface Props {
  onParsed: (payload: { resumeId: string; fileName: string }) => void;
  fileName?: string | null;
  disabled?: boolean;
}

/**
 * Resume upload: PDF, Word, or text file. Parsed through the shared Edge Function.
 */
export function ResumeFilePicker({ onParsed, fileName, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { resumeId } = await uploadAndParseResume(file);
      onParsed({ resumeId, fileName: file.name });
      toast.success("Resume uploaded and parsed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => fileRef.current?.click()}
      >
        <FileUp className="size-4" />
        {busy ? "Uploading…" : fileName ? "Replace file" : "Upload file"}
      </Button>
      {fileName ? (
        <p className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
          <Check className="size-4 shrink-0 text-primary" />
          {fileName}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Choose a PDF, Word document, or .txt file.
        </p>
      )}
    </div>
  );
}
