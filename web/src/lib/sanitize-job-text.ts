/** Cut scraped Upwork / board chrome so analyze gets mostly the job body. */
const FOOTER_MARKERS: RegExp[] = [
  /footer navigation/i,
  /about upwork/i,
  /terms of service/i,
  /privacy policy/i,
  /©\s*\d{4}\s*upwork/i,
  /browse categories on desktop/i,
  /for clients\s*\n/i,
  /for talent\s*\n/i,
];

const MAX_JOB_CHARS = 80_000;

export interface SanitizeJobTextResult {
  text: string;
  trimmed: boolean;
  removedFooter: boolean;
}

export function sanitizeJobText(raw: string): SanitizeJobTextResult {
  let text = raw.trim();
  let removedFooter = false;

  for (const marker of FOOTER_MARKERS) {
    const idx = text.search(marker);
    if (idx > 400) {
      text = text.slice(0, idx).trim();
      removedFooter = true;
    }
  }

  text = text.replace(/\n{4,}/g, "\n\n\n");

  let trimmed = false;
  if (text.length > MAX_JOB_CHARS) {
    text = text.slice(0, MAX_JOB_CHARS).trim();
    trimmed = true;
  }

  return { text, trimmed, removedFooter };
}
