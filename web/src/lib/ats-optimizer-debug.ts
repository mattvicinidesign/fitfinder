/** Show rejected ATS candidates in the review UI (dev or explicit flag). */
export function isAtsOptimizerDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ATS_OPTIMIZER_DEBUG === "true"
  );
}
