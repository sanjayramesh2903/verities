/**
 * Client-side document text extraction.
 * Supports: PDF (pdfjs-dist), DOCX/DOC (mammoth), TXT/MD/RTF (FileReader)
 */

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentParseError";
  }
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new DocumentParseError("Failed to read text file"));
    reader.readAsText(file, "utf-8");
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentParseError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`
    );
  }

  const ext = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new DocumentParseError(
      `Unsupported file type "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }

  switch (ext) {
    case ".pdf":
      return parsePdf(file);
    case ".docx":
    case ".doc":
      return parseDocx(file);
    case ".txt":
    case ".md":
    case ".rtf":
      return parseText(file);
    default:
      throw new DocumentParseError(`Unsupported file type: ${ext}`);
  }
}
