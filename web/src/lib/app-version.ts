/** Client-visible app version (from package.json at build time). */
export function getAppVersionLabel(): string {
  const raw = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (!raw) return "v0.0.0";
  return raw.startsWith("v") ? raw : `v${raw}`;
}
