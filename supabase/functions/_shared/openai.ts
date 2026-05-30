// Thin OpenAI wrapper used by the AI layer. Centralizing it keeps the model,
// JSON-mode handling, and error behavior consistent across functions.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Calls the chat completions API in JSON mode and parses the result as T.
 * Throws if the API key is missing, the request fails, or the body isn't JSON.
 */
export async function completeJSON<T>(messages: ChatMessage[]): Promise<T> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI returned an unexpected response shape");
  }

  return JSON.parse(content) as T;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mimeForFilename(filename: string): string {
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (filename.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Extract plain text from a resume file (PDF, Word, etc.) via OpenAI. */
export async function extractDocumentText(
  filename: string,
  bytes: Uint8Array,
): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    throw new Error("Resume file must be under 5MB.");
  }

  const mime = mimeForFilename(filename.toLowerCase());
  const base64 = uint8ToBase64(bytes);

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extract all readable text from the resume document. Return JSON {"text":"..."} with the full plain text.',
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename,
                file_data: `data:${mime};base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Extract every line of readable text from this resume.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI document extraction failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI returned an unexpected response shape");
  }

  const parsed = JSON.parse(content) as { text?: string };
  const text = parsed.text?.trim();
  if (!text) {
    throw new Error("Could not extract text from this resume file.");
  }
  return text;
}
