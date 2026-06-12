import { assertEquals } from "jsr:@std/assert@1";
import { sanitizeEmployerType } from "./employer_type_validate.ts";

const REAL_ESTATE_UX_JOB = `Senior UX/UI Designer - Real Estate Training Platform
We're looking for an experienced UX/UI Designer to help improve the usability and overall user experience of a web-based product currently in development.
Review existing application screens and user flows.
About the client
USA
Scottsdale`;

Deno.test("real estate training platform is product company not agency", () => {
  assertEquals(
    sanitizeEmployerType(
      REAL_ESTATE_UX_JOB,
      { employerType: "agency", roleTitle: "Senior UX/UI Designer" },
      "Senior UX/UI Designer - Real Estate Training Platform",
    ),
    "product_company",
  );
});

Deno.test("agency label requires agency evidence in text", () => {
  assertEquals(
    sanitizeEmployerType(
      "We are a digital marketing agency seeking a freelance designer.",
      { employerType: "agency", roleTitle: null },
      null,
    ),
    "agency",
  );
});

Deno.test("LLM agency guess without evidence becomes unknown", () => {
  assertEquals(
    sanitizeEmployerType(
      "Join our team to redesign checkout flows for our SaaS dashboard.",
      { employerType: "agency", roleTitle: "Product Designer" },
      null,
    ),
    "product_company",
  );
});

Deno.test("generic freelance post without employer signals is unknown", () => {
  assertEquals(
    sanitizeEmployerType(
      "Need a designer for wireframes and mockups. Must know Figma.",
      { employerType: "agency", roleTitle: "UX Designer" },
      null,
    ),
    "unknown",
  );
});
