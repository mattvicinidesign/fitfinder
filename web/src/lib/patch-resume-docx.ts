import JSZip from "jszip";
import { buildPhraseBoundaryPattern } from "@/lib/ats-keyword-optimization-core";
import type { AtsKeywordChange } from "@/lib/types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function isBulletParagraphXml(paragraphXml: string): boolean {
  if (/<w:numPr\b/.test(paragraphXml)) return true;
  if (/<w:pStyle[^>]+w:val="ListParagraph"/.test(paragraphXml)) return true;
  return /<w:t[^>]*>\s*[•●◦▪\-*–—]\s/.test(paragraphXml);
}

type DocxRunSlice = {
  open: string;
  text: string;
  close: string;
  start: number;
  end: number;
};

function extractDocxRunSlices(paragraphXml: string): DocxRunSlice[] {
  const slices: DocxRunSlice[] = [];
  let cursor = 0;

  paragraphXml.replace(
    /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g,
    (match, open: string, text: string, close: string, offset: number) => {
      void match;
      void offset;
      const decoded = unescapeXml(text);
      slices.push({
        open,
        text: decoded,
        close,
        start: cursor,
        end: cursor + decoded.length,
      });
      cursor += decoded.length;
      return match;
    },
  );

  return slices;
}

function rebuildParagraphWithSlices(
  paragraphXml: string,
  slices: DocxRunSlice[],
): string {
  let sliceIndex = 0;
  return paragraphXml.replace(
    /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g,
    (match, open: string, _text: string, close: string) => {
      const slice = slices[sliceIndex];
      sliceIndex += 1;
      if (!slice) return match;
      return `${open}${escapeXml(slice.text)}${close}`;
    },
  );
}

function patchDocxParagraphRuns(
  paragraphXml: string,
  before: string,
  after: string,
): string {
  const slices = extractDocxRunSlices(paragraphXml);
  if (slices.length === 0) return paragraphXml;

  const fullText = slices.map((slice) => slice.text).join("");
  const pattern = buildPhraseBoundaryPattern(before, "i");
  const match = pattern.exec(fullText);
  if (!match || match.index === undefined) {
    return paragraphXml;
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const firstOverlapIdx = slices.findIndex((slice) => slice.end > matchStart);
  const lastOverlapIdx = slices.findLastIndex((slice) => slice.start < matchEnd);
  if (firstOverlapIdx === -1 || lastOverlapIdx === -1) {
    return paragraphXml;
  }

  const nextSlices = slices.map((slice, index) => {
    if (index < firstOverlapIdx || index > lastOverlapIdx) {
      return slice;
    }

    if (firstOverlapIdx === lastOverlapIdx) {
      const prefix = slice.text.slice(0, matchStart - slice.start);
      const suffix = slice.text.slice(matchEnd - slice.start);
      return { ...slice, text: prefix + after + suffix };
    }

    if (index === firstOverlapIdx) {
      const prefix = slice.text.slice(0, matchStart - slice.start);
      return { ...slice, text: prefix + after };
    }

    if (index === lastOverlapIdx) {
      const suffix = slice.text.slice(matchEnd - slice.start);
      return { ...slice, text: suffix };
    }

    return { ...slice, text: "" };
  });

  return rebuildParagraphWithSlices(paragraphXml, nextSlices);
}

function patchDocxXmlBulletParagraphs(
  xml: string,
  before: string,
  after: string,
): string {
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!isBulletParagraphXml(paragraph)) return paragraph;
    return patchDocxParagraphRuns(paragraph, before, after);
  });
}

/** Patch keyword substitutions in-place inside bullet paragraphs of the original DOCX. */
export async function patchDocxBlob(
  blob: Blob,
  substitutions: AtsKeywordChange[],
): Promise<Blob> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  let xml = await documentFile.async("string");
  for (const substitution of substitutions) {
    xml = patchDocxXmlBulletParagraphs(xml, substitution.before, substitution.after);
  }

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "blob" });
}
