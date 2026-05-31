const TEXT_TYPES = new Set(["text/plain"]);
const TEXT_EXTENSIONS = /\.(txt|md|markdown)$/i;
const PDF_EXTENSIONS = /\.pdf$/i;
const DOCX_EXTENSIONS = /\.docx$/i;

/** Extract plain text from a resume file in the browser when possible. */
export async function extractResumeTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(name)) {
    return (await file.text()).trim();
  }

  if (file.type === "application/pdf" || PDF_EXTENSIONS.test(name)) {
    return extractPdfText(file);
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    DOCX_EXTENSIONS.test(name)
  ) {
    return extractDocxText(file);
  }

  // Legacy .doc and other formats: server extracts from Storage.
  return "";
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) parts.push(pageText);
  }

  return parts.join("\n\n").trim();
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return result.value.trim();
}
