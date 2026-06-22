"use client";

import type { PdfTextRun } from "@/lib/extract-resume-pdf-runs";
import { normalizePdfTextRun } from "@/lib/extract-resume-pdf-runs";

const DB_NAME = "fitfinder-resume-files";
const DB_VERSION = 1;
const FILE_STORE = "files";
const META_STORE = "meta";
const RUNS_STORE = "pdf-runs";

export type CachedResumeFileMeta = {
  resumeId: string;
  fileName: string;
  mimeType: string;
  pageCount: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(RUNS_STORE)) {
        db.createObjectStore(RUNS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open resume file cache."));
  });
}

async function putValue<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getValue<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

export async function cacheResumeFile(
  resumeId: string,
  file: File,
  meta: Omit<CachedResumeFileMeta, "resumeId" | "mimeType">,
): Promise<void> {
  await putValue(FILE_STORE, resumeId, file);
  await putValue<CachedResumeFileMeta>(META_STORE, resumeId, {
    resumeId,
    fileName: meta.fileName,
    mimeType: file.type || "application/octet-stream",
    pageCount: meta.pageCount,
  });
}

export async function cacheResumePdfRuns(
  resumeId: string,
  runs: PdfTextRun[],
): Promise<void> {
  await putValue(RUNS_STORE, resumeId, runs);
}

export async function getCachedResumeFileMeta(
  resumeId: string,
): Promise<CachedResumeFileMeta | null> {
  return getValue<CachedResumeFileMeta>(META_STORE, resumeId);
}

export async function getCachedResumeFile(resumeId: string): Promise<File | null> {
  return getValue<File>(FILE_STORE, resumeId);
}

export async function getCachedResumePdfRuns(
  resumeId: string,
): Promise<PdfTextRun[] | null> {
  const runs = await getValue<Partial<PdfTextRun>[]>(RUNS_STORE, resumeId);
  if (!runs) return null;
  return runs.map((run) =>
    normalizePdfTextRun(
      run as Partial<PdfTextRun> & Pick<PdfTextRun, "page" | "x" | "y" | "str" | "fontSize" | "width">,
    ),
  );
}
