import { buildMeta } from "@/lib/build-meta";

/** Client-visible app version (package base + cap-sync build counter). */
export function getAppVersionLabel(): string {
  if (buildMeta.versionLabel?.trim()) {
    const label = buildMeta.versionLabel.trim();
    return label.startsWith("v") ? label : `v${label}`;
  }

  const base = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.0.0";
  const build = buildMeta.build;

  if (build > 0) {
    const [major, minor] = base.split(".");
    return `v${major}.${minor}.${build}`;
  }

  return base.startsWith("v") ? base : `v${base}`;
}
