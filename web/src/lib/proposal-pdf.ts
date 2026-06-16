"use client";

import { jsPDF } from "jspdf";

export interface ProposalPdfInput {
  candidateName: string | null;
  portfolioUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
  proposalText: string;
}

function safeFileName(input: ProposalPdfInput): string {
  const parts = [input.candidateName, input.jobTitle, "proposal"].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  const base = parts.join(" ").trim() || "proposal";
  return `${base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}.pdf`;
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/** Export the edited proposal text as a clean PDF. */
export function downloadProposalPdf(input: ProposalPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  if (input.candidateName?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    ensureSpace(24);
    doc.text(input.candidateName.trim(), margin, y);
    y += 24;
  }

  const subParts = [input.jobTitle, input.companyName].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  if (subParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    ensureSpace(14);
    doc.text(subParts.join("  •  "), margin, y);
    y += 18;
  }

  ensureSpace(10);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  const bodyLine = 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);

  for (const line of input.proposalText.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim()) {
      y += bodyLine * 0.45;
      continue;
    }
    ensureSpace(bodyLine);
    y = writeWrapped(doc, line, margin, y, contentWidth, bodyLine);
  }

  doc.save(safeFileName(input));
}
