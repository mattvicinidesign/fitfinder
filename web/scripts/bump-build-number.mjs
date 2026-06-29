import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = join(root, "build-meta.json");
const pkgPath = join(root, "package.json");
const pbxPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor] = pkg.version.split(".");

let meta = { build: 0 };
try {
  meta = JSON.parse(readFileSync(metaPath, "utf8"));
} catch {
  // First run — start from zero; cap sync bumps to 1.
}

meta.build = Number(meta.build ?? 0) + 1;
meta.versionLabel = `${major}.${minor}.${meta.build}`;

writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

let pbx = readFileSync(pbxPath, "utf8");
pbx = pbx.replace(
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${meta.versionLabel};`,
);
pbx = pbx.replace(
  /CURRENT_PROJECT_VERSION = [^;]+;/g,
  `CURRENT_PROJECT_VERSION = ${meta.build};`,
);
writeFileSync(pbxPath, pbx);

console.log(
  `[bump-build-number] v${meta.versionLabel} (cap sync build ${meta.build})`,
);
