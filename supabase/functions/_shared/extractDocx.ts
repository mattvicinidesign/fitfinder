import mammoth from "npm:mammoth@1.12.0";
import { assertResumeFileBytes } from "./payload_limits.ts";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

/** Extract plain text from a .docx file without OpenAI (PDF-only file API). */
export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const tooBig = assertResumeFileBytes(bytes.length);
  if (tooBig) throw new Error(tooBig);

  const result = await mammoth.extractRawText({
    arrayBuffer: toArrayBuffer(bytes),
  });
  const text = result.value.trim();
  if (!text) {
    throw new Error("Could not extract text from this Word document.");
  }
  return text;
}
