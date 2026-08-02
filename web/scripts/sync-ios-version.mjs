import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mirror Xcode MARKETING_VERSION / CURRENT_PROJECT_VERSION into build-meta.json.
 * Xcode remains the single source of truth — this never writes back to the project
 * and never increments version or build.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = join(root, "build-meta.json");
const pbxPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");

const pbx = readFileSync(pbxPath, "utf8");
const marketing = pbx.match(/MARKETING_VERSION = ([^;]+);/);
const projectVersion = pbx.match(/CURRENT_PROJECT_VERSION = ([^;]+);/);

if (!marketing || !projectVersion) {
  throw new Error(
    "[sync-ios-version] Could not read MARKETING_VERSION / CURRENT_PROJECT_VERSION from Xcode project",
  );
}

const version = marketing[1].trim();
const build = Number(projectVersion[1].trim());

if (!version || !Number.isFinite(build)) {
  throw new Error(
    `[sync-ios-version] Invalid Xcode version/build: version=${version}, build=${projectVersion[1].trim()}`,
  );
}

writeFileSync(metaPath, `${JSON.stringify({ version, build }, null, 2)}\n`);
console.log(
  `[sync-ios-version] Mirrored Xcode Version ${version} (build ${build}) → build-meta.json`,
);
