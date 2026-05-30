"use client";

import { useRef, useState } from "react";
import { FileUp, ImageIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { uploadAndParseResume } from "@/lib/resume-upload";
import { isNativePlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onParsed: (payload: {
    resumeId: string;
    resumeText: string;
  }) => void;
  disabled?: boolean;
}

/**
 * Resume upload: Files app / camera roll on iOS (via file input in WKWebView)
 * and desktop file picker on web. Parsed through the shared Edge Function.
 */
export function ResumeFilePicker({ onParsed, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { resumeId, resumeText } = await uploadAndParseResume(file);
      onParsed({ resumeId, resumeText });
      toast.success("Resume uploaded and parsed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={imageRef}
        type="file"
        className="hidden"
        accept="image/*"
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
        {busy ? "Uploading…" : "Upload file"}
      </Button>
      {isNativePlatform() ? (
        <button
          type="button"
          disabled={disabled || busy}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() => imageRef.current?.click()}
        >
          <ImageIcon className="size-4" />
          Photo / camera roll
        </button>
      ) : null}
    </div>
  );
}
