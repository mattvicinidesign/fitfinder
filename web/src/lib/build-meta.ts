import rawBuildMeta from "../../build-meta.json";

export type BuildMeta = {
  build: number;
  versionLabel?: string;
};

/** Cap-sync build counter — imported from committed build-meta.json at compile time. */
export const buildMeta: BuildMeta = {
  build: Number(rawBuildMeta.build ?? 0),
  versionLabel:
    typeof rawBuildMeta.versionLabel === "string"
      ? rawBuildMeta.versionLabel
      : undefined,
};
