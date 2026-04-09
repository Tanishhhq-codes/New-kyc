import { supabase } from "@/lib/supabase";

export const KYC_DOCUMENTS_BUCKET = "kyc-documents";

export type KycFileType = "image" | "pdf" | "unknown";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Accepts either a plain storage path or a full URL and returns a bucket-relative path.
export function extractStoragePath(filePathOrUrl: string): string {
  const raw = filePathOrUrl.trim();
  if (!raw) {
    throw new Error("Empty document path");
  }

  // Already a path like user_id/file.pdf
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return raw.replace(/^\/+/, "");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid document URL");
  }

  const decodedPathname = safeDecodeURIComponent(parsed.pathname);
  const parts = decodedPathname.split("/").filter(Boolean);

  const bucketIndex = parts.findIndex((part) => part === KYC_DOCUMENTS_BUCKET);
  if (bucketIndex === -1 || bucketIndex === parts.length - 1) {
    throw new Error("Could not extract storage path from URL");
  }

  return parts.slice(bucketIndex + 1).join("/");
}

export async function getSignedDocumentUrl(filePathOrUrl: string): Promise<string> {
  const storagePath = extractStoragePath(filePathOrUrl);

  const { data, error } = await supabase.storage
    .from(KYC_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to generate signed URL");
  }

  return data.signedUrl;
}

export function detectKycFileType(filePathOrUrl: string): KycFileType {
  const normalized = filePathOrUrl.toLowerCase().split("?")[0].split("#")[0];

  if (/(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/.test(normalized)) {
    return "image";
  }

  if (normalized.endsWith(".pdf")) {
    return "pdf";
  }

  return "unknown";
}

export function getDocumentName(filePathOrUrl: string): string {
  const path = filePathOrUrl.split("?")[0].split("#")[0];
  return path.split("/").filter(Boolean).pop() || "document";
}
