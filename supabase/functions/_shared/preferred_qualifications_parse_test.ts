import { assertEquals } from "jsr:@std/assert@1";
import {
  extractHeaderLocationPreference,
  extractPreferredQualificationsFields,
  isClientOriginNotApplicantPreference,
  resolveJobCountryRequirement,
  resolveJobPreferredLocation,
  resolveJobTalentType,
  resolveJobTimezoneRequirement,
} from "./preferred_qualifications_parse.ts";

const PREFERRED_BLOCK = `Preferred qualifications
Talent Type:
Independent
Job Success Score:
At least 80%
English level:
Fluent
Location:
Americas, Europe
Activity on this job
Proposals:
50+`;

Deno.test("extracts Location from Preferred qualifications", () => {
  const pq = extractPreferredQualificationsFields(PREFERRED_BLOCK);
  assertEquals(pq.location, "Americas, Europe");
  assertEquals(pq.timezone, null);
});

Deno.test("extracts Talent Type Independent from Preferred qualifications", () => {
  const pq = extractPreferredQualificationsFields(PREFERRED_BLOCK);
  assertEquals(pq.talentType, "Independent");
  assertEquals(resolveJobTalentType(PREFERRED_BLOCK), "Independent");
});

Deno.test("resolveJobCountryRequirement uses Location when parse field empty", () => {
  assertEquals(
    resolveJobCountryRequirement({}, PREFERRED_BLOCK),
    "Americas, Europe",
  );
});

Deno.test("resolveJobPreferredLocation prefers PQ Location over vague Worldwide parse", () => {
  assertEquals(
    resolveJobCountryRequirement(
      { countryRequirement: "Worldwide" },
      PREFERRED_BLOCK,
    ),
    "Americas, Europe",
  );
});

const US_ONLY_HEADER = `UI/UX Web Designer
Posted 2 days ago
Only freelancers located in the U.S. may apply.

Summary
We need a designer.

About the client
United States
Miami 3:03 PM`;

Deno.test("extractHeaderLocationPreference reads US-only header line", () => {
  assertEquals(
    extractHeaderLocationPreference(US_ONLY_HEADER),
    "United States",
  );
});

Deno.test("resolveJobPreferredLocation ignores About the client country", () => {
  const job = `Senior UX Strategist
Posted 4 weeks ago
Worldwide

Summary
Body text.

About the client
United States
Miami 1:25 PM`;

  assertEquals(
    resolveJobPreferredLocation(
      {
        countryRequirement: "United States",
        postingDetails: { clientOrigin: "United States" },
      },
      job,
    ),
    null,
  );
});

Deno.test("resolveJobPreferredLocation uses header US-only over client origin parse", () => {
  assertEquals(
    resolveJobPreferredLocation(
      {
        countryRequirement: "United States",
        postingDetails: { clientOrigin: "United States" },
      },
      US_ONLY_HEADER,
    ),
    "United States",
  );
});

Deno.test("isClientOriginNotApplicantPreference detects client base only", () => {
  const job = `Title
Posted 1 day ago
Worldwide

About the client
United States`;

  assertEquals(
    isClientOriginNotApplicantPreference(
      "United States",
      { postingDetails: { clientOrigin: "United States" } },
      job,
    ),
    true,
  );
});

Deno.test("resolveJobTimezoneRequirement ignores job parse; uses preferred block only", () => {
  assertEquals(resolveJobTimezoneRequirement({}, PREFERRED_BLOCK), null);
  assertEquals(
    resolveJobTimezoneRequirement(
      { timezoneRequirement: "PST" },
      PREFERRED_BLOCK,
    ),
    null,
  );
});

const WITH_TIMEZONE = `Preferred qualifications
Location:
United States
Time zone:
PST
Activity on this job`;

Deno.test("extracts Time zone from Preferred qualifications", () => {
  const pq = extractPreferredQualificationsFields(WITH_TIMEZONE);
  assertEquals(pq.timezone, "PST");
  assertEquals(pq.location, "United States");
});

// Mirrors web/src/lib/job-posting-requirements.ts postingRequiresAmericasRegion
function postingRequiresAmericasRegion(requirement: string): boolean {
  const n = requirement.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  if (/\bunited states\b|\busa\b|\bu s a\b/.test(n)) return true;
  if (/\bamericas\b/.test(n)) return true;
  if (/\bamerica\b/.test(n)) return true;
  return false;
}

Deno.test("Americas in Location qualifies for green country pill", () => {
  assertEquals(postingRequiresAmericasRegion("Americas, Europe"), true);
  assertEquals(postingRequiresAmericasRegion("Europe"), false);
});
