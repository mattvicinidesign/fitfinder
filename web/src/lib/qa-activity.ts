const QA_EMPTY_ACTIVITY_KEY = "qa-empty-activity";

/** After QA hard refresh — activity lists stay empty until the user runs a new analysis. */
export function markQaEmptyActivityLists(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(QA_EMPTY_ACTIVITY_KEY, "1");
}

export function shouldForceEmptyActivityLists(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(QA_EMPTY_ACTIVITY_KEY) === "1";
}

export function clearQaEmptyActivityMark(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(QA_EMPTY_ACTIVITY_KEY);
}
