import { AnalyzeScreen } from "@/components/screens/analyze-screen";

/**
 * Fit Finder Preview — the canonical UI reference.
 * Renders the exact same AnalyzeScreen used in production on every platform.
 * Open this route in Cursor or a browser to preview the real product chrome.
 */
export default function FitFinderPreviewPage() {
  return <AnalyzeScreen demo />;
}
