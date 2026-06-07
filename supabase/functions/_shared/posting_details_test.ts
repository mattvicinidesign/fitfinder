import { assertEquals } from "jsr:@std/assert@1";
import {
  extractPostingDetailsFromText,
  normalizePostingDetails,
  resolvePostingDetailRows,
} from "./posting_details.ts";
import type { ParsedJob } from "./types.ts";

const UPWORK_SNIPPET = `Senior Product Designer (UI/UX) for Ongoing Projects
Posted 4 days ago
Worldwide

Needs to hire 2 Freelancers
Summary
Yo Product Designers!
...
Featured Job
More than 30 hrs/week
Hourly
More than 6 months
Duration
Expert
$30.00

-

$45.00

Hourly
...
Location:
Americas, Europe
...
About the client
Payment method verified
Rating is 4.9 out of 5.
4.9
4.85 of 4 reviews
United States
Corona Del Mar12:39 PM
$35.18 /hr avg hourly rate paid
584 hours
Member since Mar 3, 2023`;

Deno.test("Upwork paste extracts all posting detail fields", () => {
  const extracted = extractPostingDetailsFromText(UPWORK_SNIPPET);
  assertEquals(extracted.datePosted, "Posted 4 days ago");
  assertEquals(extracted.hireArea, "Worldwide");
  assertEquals(extracted.clientRating, "4.9 out of 5");
  assertEquals(extracted.clientOrigin, "United States");
  assertEquals(extracted.clientCity, "Corona Del Mar");
  assertEquals(extracted.clientAverageHourlyRate, "$35.18 /hr");
  assertEquals(extracted.hoursNeeded, "More than 30 hrs/week");
  assertEquals(extracted.duration, "More than 6 months");

  const job: ParsedJob = {
    skills: [],
    industries: [],
    workflows: [],
    compensation: { min: 30, max: 45, currency: "USD", period: "hour" },
    toolRequirements: [],
    aiRequirements: [],
  };
  const rows = resolvePostingDetailRows(job, {
    jobDescription: UPWORK_SNIPPET,
    jobTitle: "Senior Product Designer (UI/UX)",
  });
  assertEquals(rows.every((r) => !r.missing), true);
  assertEquals(rows.find((r) => r.key === "clientRating")?.section, "client");
  assertEquals(rows.find((r) => r.key === "role")?.section, "role");
  assertEquals(rows.find((r) => r.key === "hireArea")?.section, "global");
  assertEquals(rows.find((r) => r.key === "datePosted")?.section, "global");
});
