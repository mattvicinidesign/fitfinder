/**
 * Next.js requires `export const dynamic` to be a static string literal.
 * Vercel/dev need force-dynamic (per-user personalization). Capacitor static
 * export needs force-static (route is a stub; native hits the live origin).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(
  __dirname,
  "..",
  "src/app/api/jobs/recommended/route.ts",
);

const mode = process.argv[2];
if (mode !== "static" && mode !== "dynamic") {
  console.error("Usage: set-recommended-route-mode.mjs <static|dynamic>");
  process.exit(1);
}

const dynamicValue = mode === "static" ? "force-static" : "force-dynamic";
const revalidateLine =
  mode === "static" ? "export const revalidate = 300;\n" : "";

let source = fs.readFileSync(routePath, "utf8");

if (!/export const dynamic = "force-(static|dynamic)";/.test(source)) {
  console.error(
    "[set-recommended-route-mode] Could not find dynamic export in",
    routePath,
  );
  process.exit(1);
}

source = source.replace(
  /export const dynamic = "force-(static|dynamic)";\n(?:export const revalidate = \d+;\n)?/,
  `export const dynamic = "${dynamicValue}";\n${revalidateLine}`,
);

fs.writeFileSync(routePath, source, "utf8");
console.log(
  `[set-recommended-route-mode] Set recommended jobs route to ${dynamicValue}`,
);
