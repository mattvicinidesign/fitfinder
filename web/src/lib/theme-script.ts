import { THEME_STORAGE_KEY } from "@/components/theme-provider";

/** Inline script for layout `<head>` — applies stored theme before first paint. */
export const THEME_BLOCKING_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"){document.documentElement.classList.remove("dark");}else{document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;
