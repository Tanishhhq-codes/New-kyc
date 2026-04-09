"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Meteors } from "@/components/ui/meteors";
import { supabase } from "@/lib/supabase";
import { ArrowUpRight } from "lucide-react";

type KycFormProps = {
  onSubmitted?: () => void;
};

export function KycForm({ onSubmitted }: KycFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filesSummary, setFilesSummary] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files || files.length === 0) { setFilesSummary(""); return; }
    setFilesSummary(`${files.length} file${files.length > 1 ? "s" : ""} selected`);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setUploading(true);

    // Read form fields before any await so the event target is still valid.
    const formData = new FormData(formElement);
    const fullName = formData.get("fullName") as string;
    const aadhaar = formData.get("aadhaar") as string;
    const pan = formData.get("pan") as string;
    const documentNumber = formData.get("documentNumber") as string;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); router.replace("/login"); return; }

    const userId = session.user.id;
    const files = fileInputRef.current?.files;

    // Upload documents to Supabase Storage
    const documentUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("kyc-documents")
          .upload(path, file);
        if (uploadError) {
          console.error("KYC document upload failed:", uploadError);
          setError(uploadError.message);
          setUploading(false);
          return;
        }
        documentUrls.push(path);
      }
    }

    // Insert KYC record
    const { error: dbError } = await supabase.from("kyc_submissions").insert({
      user_id: userId,
      full_name: fullName,
      aadhaar_number: aadhaar,
      pan_number: pan,
      document_number: documentNumber,
      document_urls: documentUrls,
      status: "pending",
    });

    setUploading(false);
    if (dbError) {
      console.error("KYC submission insert failed:", dbError);
      setError(dbError.message);
      return;
    }

    formElement.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFilesSummary("");
    onSubmitted?.();
    alert("KYC submitted successfully! We'll review it shortly.");
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-8 shadow-2xl">
      <div className="h-7 w-7 rounded-full border border-zinc-700 bg-zinc-800/60 mb-2 flex items-center justify-center">
        <ArrowUpRight className="h-3.5 w-3.5 text-sky-300" />
      </div>

      <h2 className="relative z-10 text-2xl font-light tracking-tight text-zinc-100">
        Submit KYC Details
      </h2>

      <p className="relative z-10 mb-2 text-sm text-zinc-400">
        Provide your details and upload documents to complete verification.
      </p>

      <form onSubmit={handleSubmit} className="relative z-10 mt-4 grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium tracking-wide text-zinc-300">Full name</label>
          <input
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium tracking-wide text-zinc-300">Aadhaar number</label>
            <input
              name="aadhaar"
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium tracking-wide text-zinc-300">PAN card</label>
            <input
              name="pan"
              type="text"
              placeholder="ABCDE1234F"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium tracking-wide text-zinc-300">Passport / Driving licence</label>
          <input
            name="documentNumber"
            type="text"
            placeholder="Document number"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFilesChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 inline-flex items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            Upload all documents
          </button>
          {filesSummary && <p className="text-[11px] text-zinc-400">{filesSummary}</p>}
        </div>

        {error && <p className="text-xs text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={uploading}
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-base font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          {uploading ? "Submitting..." : "Submit KYC"}
        </button>
      </form>

      <Meteors number={30} />
    </div>
  );
}
