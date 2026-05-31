export const PROFILE_SHEET_ENTER_KEY = "fitfinder-profile-sheet-enter";
export const PROFILE_RETURN_PATH_KEY = "fitfinder-profile-return-path";

export function markProfileSheetEnter(fromPath: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PROFILE_SHEET_ENTER_KEY, "true");
  sessionStorage.setItem(PROFILE_RETURN_PATH_KEY, fromPath);
}

export function consumeProfileSheetEnter(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(PROFILE_SHEET_ENTER_KEY) !== "true") return false;
  sessionStorage.removeItem(PROFILE_SHEET_ENTER_KEY);
  return true;
}

export function getProfileReturnPath(): string {
  if (typeof sessionStorage === "undefined") return "/home";
  const path = sessionStorage.getItem(PROFILE_RETURN_PATH_KEY);
  return path && path !== "/profile" ? path : "/home";
}

export function clearProfileReturnPath(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PROFILE_RETURN_PATH_KEY);
}
