import {
  assertEquals,
  assertStringIncludes,
} from "jsr:@std/assert@1";
import {
  escapePdfLiteral,
  patchPdfContentStreamBytes,
} from "./patch_pdf_content_stream.ts";
import type { PdfTextRun } from "./pdf_extract_runs.ts";

Deno.test("escapePdfLiteral escapes parentheses and backslashes", () => {
  assertEquals(escapePdfLiteral("a(b)\\c"), "a\\(b\\)\\\\c");
});

Deno.test("patchPdfContentStreamBytes replaces literals in place", () => {
  const source = "BT /F1 12 Tf 100 700 Td (Helped build) Tj ET";
  const bytes = new TextEncoder().encode(source);
  const patched = patchPdfContentStreamBytes(bytes, [
    { before: "Helped build", after: "Built" },
  ]);

  assertEquals(patched.appliedSubstitutions.length, 1);
  assertEquals(patched.rejectedSubstitutions.length, 0);
  const output = new TextDecoder().decode(patched.bytes);
  assertStringIncludes(output, "(Built) Tj");
  assertEquals(output.includes("12 Tf"), true);
  assertEquals(output.includes("/F1"), true);
});

Deno.test("patchPdfContentStreamBytes targets run on matching line", () => {
  const source =
    "BT /F1 10 Tf 100 700 Td (Helped build) Tj ET\nBT /F1 10 Tf 100 680 Td (Helped build) Tj ET";
  const bytes = new TextEncoder().encode(source);
  const runs: PdfTextRun[] = [
    {
      page: 1,
      x: 100,
      y: 680,
      str: "Helped build",
      fontSize: 10,
      width: 80,
      height: 12,
      fontName: "Helvetica",
      avgCharWidth: 6,
    },
  ];

  const patched = patchPdfContentStreamBytes(
    bytes,
    [{ before: "Helped build", after: "Built", lineIndex: 0 }],
    runs,
  );

  const output = new TextDecoder().decode(patched.bytes);
  assertEquals((output.match(/\(Built\) Tj/g) ?? []).length, 1);
  assertEquals((output.match(/\(Helped build\) Tj/g) ?? []).length, 1);
});

Deno.test("patchPdfContentStreamBytes preserves unmatched content", () => {
  const source = "BT /F2 11 Tf (Managed projects) Tj (Delivered results) Tj ET";
  const bytes = new TextEncoder().encode(source);
  const patched = patchPdfContentStreamBytes(bytes, [
    { before: "Managed", after: "Led" },
  ]);

  const output = new TextDecoder().decode(patched.bytes);
  assertStringIncludes(output, "(Led projects) Tj");
  assertStringIncludes(output, "(Delivered results) Tj");
  assertStringIncludes(output, "/F2 11 Tf");
});
