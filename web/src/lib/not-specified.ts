/** Shown when a posting field was looked for but not found. */
export const NOT_SPECIFIED_LABEL = "Not Specified";

export function isNotSpecifiedDisplay(label: string): boolean {
  const t = label.trim();
  return (
    t === NOT_SPECIFIED_LABEL ||
    t === "Not specified" ||
    t === "Not stated in posting" ||
    t === "—" ||
    t === "-"
  );
}
