/** Scroll a section into view inside the app scroll container (not the document). */
export function scrollToSectionInAppContainer(
  sectionId: string,
  options?: {
    behavior?: ScrollBehavior;
    offset?: number;
    scrollRoot?: HTMLElement | null;
  },
): boolean {
  const element = document.getElementById(sectionId);
  if (!element) return false;

  const scrollRoot =
    options?.scrollRoot ??
    (element.closest("[data-app-scroll-y]") as HTMLElement | null);
  const behavior = options?.behavior ?? "auto";
  const offset = options?.offset ?? 0;

  if (!scrollRoot) {
    element.scrollIntoView({ behavior, block: "start" });
    return true;
  }

  const rootTop = scrollRoot.getBoundingClientRect().top;
  const elTop = element.getBoundingClientRect().top;
  const nextTop = scrollRoot.scrollTop + (elTop - rootTop) - offset;

  scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior });
  return true;
}
