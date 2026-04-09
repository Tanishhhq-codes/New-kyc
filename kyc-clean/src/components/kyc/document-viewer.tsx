"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  detectKycFileType,
  getDocumentName,
  getSignedDocumentUrl,
  type KycFileType,
} from "@/utils/kyc-documents";

type ResolvedDocument = {
  source: string;
  name: string;
  signedUrl: string;
  type: KycFileType;
};

type DocumentViewerProps = {
  documentUrls: string[];
};

function DocumentCard({ doc }: { doc: ResolvedDocument }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-zinc-100">{doc.name}</p>
        <a
          href={doc.signedUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Open in new tab
        </a>
      </div>

      {doc.type === "image" ? (
        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-zinc-950">
          <Image src={doc.signedUrl} alt={doc.name} fill className="object-contain" unoptimized />
        </div>
      ) : doc.type === "pdf" ? (
        <iframe
          title={doc.name}
          src={doc.signedUrl}
          className="h-72 w-full rounded-xl border border-zinc-800"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-sm text-zinc-400">
          Preview is not available for this file type.
        </div>
      )}
    </div>
  );
}

export function DocumentViewer({ documentUrls }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ResolvedDocument[]>([]);

  const stableUrls = useMemo(() => documentUrls.filter(Boolean), [documentUrls]);

  useEffect(() => {
    let cancelled = false;

    async function resolveSignedUrls() {
      setLoading(true);
      setError(null);

      try {
        const resolved = await Promise.all(
          stableUrls.map(async (source) => {
            const signedUrl = await getSignedDocumentUrl(source);
            return {
              source,
              name: getDocumentName(source),
              signedUrl,
              type: detectKycFileType(source),
            } as ResolvedDocument;
          })
        );

        if (!cancelled) {
          setDocuments(resolved);
        }
      } catch (err) {
        if (!cancelled) {
          setDocuments([]);
          setError(err instanceof Error ? err.message : "Failed to load documents");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (stableUrls.length === 0) {
      setLoading(false);
      setDocuments([]);
      setError(null);
      return;
    }

    resolveSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [stableUrls]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 h-4 w-32 rounded bg-zinc-700" />
            <div className="h-64 w-full rounded-xl bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        Unable to load documents. {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        No documents available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {documents.map((doc) => (
        <DocumentCard key={doc.source} doc={doc} />
      ))}
    </div>
  );
}
