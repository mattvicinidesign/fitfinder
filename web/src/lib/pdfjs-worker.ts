"use client";

import { WorkerMessageHandler } from "pdfjs-dist/build/pdf.worker.mjs";

const WORKER_PATH = "/pdf.worker.min.mjs";

type PdfJsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: {
    WorkerMessageHandler?: typeof WorkerMessageHandler;
  };
};

const global = globalThis as PdfJsWorkerGlobal;
global.pdfjsWorker ??= { WorkerMessageHandler };

/** Ensure pdf.js uses the bundled in-process worker (required on Capacitor WKWebView). */
export function ensurePdfJsWorkerReady(): void {
  global.pdfjsWorker ??= { WorkerMessageHandler };
}

/** pdf.js worker URL that works in Next dev, static export, and Capacitor. */
export function configurePdfJsWorker(
  pdfjs: typeof import("pdfjs-dist"),
): void {
  ensurePdfJsWorkerReady();
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

/** Configure pdf.js for the current runtime before parsing. */
export async function configurePdfJsForRuntime(
  pdfjs: typeof import("pdfjs-dist"),
): Promise<void> {
  configurePdfJsWorker(pdfjs);
}
