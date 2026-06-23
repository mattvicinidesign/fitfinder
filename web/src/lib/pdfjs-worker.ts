"use client";

const WORKER_PATH = "/pdf.worker.min.mjs";

/** pdf.js worker URL that works in Next dev, static export, and Capacitor. */
export function configurePdfJsWorker(
  pdfjs: typeof import("pdfjs-dist"),
): void {
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}${WORKER_PATH}`;
    return;
  }

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

/** Try alternate worker URLs when the primary Capacitor path fails. */
export function pdfJsWorkerFallbacks(): string[] {
  const fallbacks = [WORKER_PATH];
  if (typeof window !== "undefined") {
    fallbacks.unshift(`${window.location.origin}${WORKER_PATH}`);
  }
  return [...new Set(fallbacks)];
}
