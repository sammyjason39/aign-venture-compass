// Server-only: extract plain text / file parts from uploaded decks & transcripts.
import { unzipSync, strFromU8 } from "fflate";

export interface ExtractedFile {
  /** Plain text pulled from the file, if any. */
  text: string;
  /** Base64 data URL parts to pass to a multimodal model (PDFs). */
  pdfBase64?: string;
  pdfName?: string;
}

function isPptx(name: string, mime: string): boolean {
  return (
    name.toLowerCase().endsWith(".pptx") ||
    mime.includes("presentationml") ||
    mime.includes("powerpoint")
  );
}

function isPdf(name: string, mime: string): boolean {
  return name.toLowerCase().endsWith(".pdf") || mime.includes("pdf");
}

function isPlainText(name: string, mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    /\.(txt|md|vtt|srt|csv|json)$/i.test(name)
  );
}

/** Pull readable text out of a .pptx by unzipping slide XML. */
function extractPptxText(bytes: Uint8Array): string {
  try {
    const files = unzipSync(bytes);
    const slideNames = Object.keys(files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
        return na - nb;
      });

    const chunks: string[] = [];
    slideNames.forEach((name, i) => {
      const xml = strFromU8(files[name]);
      // <a:t>...</a:t> holds the visible text runs.
      const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].trim());
      const slideText = texts.filter(Boolean).join(" ");
      if (slideText) chunks.push(`Slide ${i + 1}: ${slideText}`);
    });
    return chunks.join("\n");
  } catch {
    return "";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function extractFromBytes(
  bytes: Uint8Array,
  name: string,
  mime: string,
): ExtractedFile {
  if (isPptx(name, mime)) {
    return { text: extractPptxText(bytes) };
  }
  if (isPdf(name, mime)) {
    return { text: "", pdfBase64: toBase64(bytes), pdfName: name };
  }
  if (isPlainText(name, mime)) {
    return { text: strFromU8(bytes) };
  }
  // Unknown binary: nothing safe to extract.
  return { text: "" };
}
