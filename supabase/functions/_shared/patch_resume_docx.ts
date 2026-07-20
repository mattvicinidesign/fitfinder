import JSZip from "npm:jszip@3.10.1";

export type AtsKeywordChange = {
  before: string;
  after: string;
  visualWidthDeltaPercent?: number;
  bulletId?: string;
  lineIndex?: number;
  matchIndex?: number;
  originalBulletText?: string;
  optimizedBulletText?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isBulletParagraphXml(paragraphXml: string): boolean {
  if (/<w:numPr\b/.test(paragraphXml)) return true;
  if (/<w:pStyle[^>]+w:val="ListParagraph"/.test(paragraphXml)) return true;
  return /<w:t[^>]*>\s*[•●◦▪\-*–—]\s/.test(paragraphXml);
}

function patchDocxXmlTextNodes(
  xml: string,
  before: string,
  after: string,
): string {
  const parts = before
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const body = parts.length > 0
    ? parts.join("\\s+")
    : before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\w-])${body}(?![\\w-])`, "i");

  return xml.replace(
    /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g,
    (match, open, text, close) => {
      if (!pattern.test(text)) return match;
      const next = text.replace(pattern, after);
      return `${open}${escapeXml(next)}${close}`;
    },
  );
}

function patchDocxXmlBulletParagraphs(
  xml: string,
  before: string,
  after: string,
): string {
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!isBulletParagraphXml(paragraph)) return paragraph;
    return patchDocxXmlTextNodes(paragraph, before, after);
  });
}

export async function patchDocxBytes(
  bytes: Uint8Array,
  substitutions: AtsKeywordChange[],
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  let xml = await documentFile.async("string");
  for (const substitution of substitutions) {
    xml = patchDocxXmlBulletParagraphs(xml, substitution.before, substitution.after);
  }

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "uint8array" });
}
