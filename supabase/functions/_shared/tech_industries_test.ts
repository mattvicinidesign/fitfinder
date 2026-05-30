import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  normalizeIndustryList,
  resolveCanonicalIndustry,
} from "./tech_industries.ts";

Deno.test("rejects skill-like labels as industries", () => {
  assertEquals(resolveCanonicalIndustry("web design"), null);
  assertEquals(resolveCanonicalIndustry("mobile app development"), null);
});

Deno.test("maps aliases to canonical labels", () => {
  assertEquals(resolveCanonicalIndustry("saas"), "SaaS");
  assertEquals(resolveCanonicalIndustry("martech"), "MarTech");
  assertEquals(resolveCanonicalIndustry("healthcare"), "HealthTech");
});

Deno.test("normalizeIndustryList rehomes unknown craft labels to skills", () => {
  const { industries, rehomedAsSkills } = normalizeIndustryList([
    "SaaS",
    "web design",
    "mobile app development",
  ]);
  assertEquals(industries, ["SaaS"]);
  assertEquals(rehomedAsSkills, ["web design", "mobile app development"]);
});
