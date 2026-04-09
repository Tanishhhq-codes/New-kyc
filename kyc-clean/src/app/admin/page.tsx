"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DocumentViewer } from "@/components/kyc/document-viewer";
import { StatusBadge } from "@/components/kyc/status-badge";
import { ToastStack, type ToastMessage } from "@/components/kyc/toast-stack";
import { hasDatabaseAdminRole, isAdminUser } from "@/utils/admin";

type SubmissionStatus = "pending" | "approved" | "rejected" | "under_review";
type FilterStatus = "all" | "pending" | "approved" | "rejected";

type KycSubmission = {
  id: string;
  user_id: string;
  full_name: string;
  aadhaar_number: string;
  pan_number: string;
  document_urls: string[];
  status: SubmissionStatus;
  submitted_at: string;
  rejection_note: string | null;
};

const filters: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 h-4 w-1/2 rounded bg-zinc-700" />
          <div className="h-3 w-1/3 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasDbAdminRole, setHasDbAdminRole] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionLoading, setActionLoading] = useState<"approved" | "rejected" | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimeouts = useRef<number[]>([]);

  const pushToast = useCallback((text: string, type: ToastMessage["type"]) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text, type }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimeouts.current = toastTimeouts.current.filter((pendingId) => pendingId !== timeoutId);
    }, 2800);
    toastTimeouts.current.push(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      toastTimeouts.current = [];
    };
  }, []);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      if (filter === "all") return true;
      return item.status === filter;
    });
  }, [filter, submissions]);

  const selectedSubmission = useMemo(() => {
    if (!selectedId) return null;
    return submissions.find((item) => item.id === selectedId) || null;
  }, [selectedId, submissions]);

  const handleFilterChange = (nextFilter: FilterStatus) => {
    setFilter(nextFilter);

    const nextVisibleSubmissions = submissions.filter((item) => {
      if (nextFilter === "all") return true;
      return item.status === nextFilter;
    });

    if (nextVisibleSubmissions.length === 0) {
      setSelectedId(null);
      setRejectionNote("");
      return;
    }

    const nextSelectedSubmission =
      selectedId && nextVisibleSubmissions.some((item) => item.id === selectedId)
        ? nextVisibleSubmissions.find((item) => item.id === selectedId) || nextVisibleSubmissions[0]
        : nextVisibleSubmissions[0];

    setSelectedId(nextSelectedSubmission.id);
    setRejectionNote(nextSelectedSubmission.rejection_note || "");
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select(
        "id,user_id,full_name,aadhaar_number,pan_number,document_urls,status,submitted_at,rejection_note"
      )
      .order("submitted_at", { ascending: false });

    if (error) {
      pushToast(error.message, "error");
      setLoading(false);
      return;
    }

    const rows = (data || []) as KycSubmission[];
    setSubmissions(rows);

    const visibleRows = rows.filter((item) => {
      if (filter === "all") return true;
      return item.status === filter;
    });

    if (visibleRows.length === 0) {
      setSelectedId(null);
      setRejectionNote("");
      setLoading(false);
      return;
    }

    const nextSelectedId =
      selectedId && visibleRows.some((row) => row.id === selectedId) ? selectedId : visibleRows[0].id;

    setSelectedId(nextSelectedId);
    const selectedRow = visibleRows.find((row) => row.id === nextSelectedId) || visibleRows[0];
    setRejectionNote(selectedRow.rejection_note || "");

    setLoading(false);
  }, [filter, pushToast, selectedId]);

  useEffect(() => {
    let alive = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const adminOk = isAdminUser(user);
      setIsAdmin(adminOk);
      setHasDbAdminRole(hasDatabaseAdminRole(user));
      setAdminUserId(user.id);
      setAuthReady(true);

      if (!adminOk) {
        return;
      }

      await fetchSubmissions();
    }

    init();

    return () => {
      alive = false;
    };
  }, [fetchSubmissions, router]);

  useEffect(() => {
    if (!authReady || !isAdmin) return;

    const channel = supabase
      .channel("admin-kyc-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kyc_submissions" },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authReady, fetchSubmissions, isAdmin]);

  const updateStatus = async (status: "approved" | "rejected") => {
    if (!selectedSubmission || !isAdmin) return;

    if (!hasDbAdminRole) {
      pushToast("Admin write access missing in JWT. Set app_metadata.role='admin' and sign in again.", "error");
      return;
    }

    if (status === "rejected" && !rejectionNote.trim()) {
      pushToast("Please add a rejection note before rejecting.", "error");
      return;
    }

    setActionLoading(status);

    const payload: {
      status: "approved" | "rejected";
      rejection_note: string | null;
      reviewed_at: string;
      reviewed_by: string | null;
    } = {
      status,
      rejection_note: status === "rejected" ? rejectionNote.trim() : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
    };

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === selectedSubmission.id
          ? {
              ...item,
              status,
              rejection_note: payload.rejection_note,
            }
          : item
      )
    );

    const response = await fetch("/api/admin/kyc-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionId: selectedSubmission.id,
        status,
        rejectionNote: rejectionNote.trim(),
      }),
    });

    let result: {
      error?: string;
      success?: boolean;
      data?: { id: string; status: SubmissionStatus; reviewed_at: string };
    } = {};

    try {
      result = (await response.json()) as {
        error?: string;
        success?: boolean;
        data?: { id: string; status: SubmissionStatus; reviewed_at: string };
      };
    } catch {
      const text = await response.text();
      result = { error: text || "Unexpected API response" };
    }

    setActionLoading(null);

    if (!response.ok || !result.success) {
      const resolvedMessage = result.error || "Failed to update status.";
      console.error("KYC status update failed:", {
        submissionId: selectedSubmission.id,
        statusCode: response.status,
        resolvedMessage,
      });
      pushToast(resolvedMessage, "error");
      await fetchSubmissions();
      return;
    }

    pushToast(status === "approved" ? "KYC Approved" : "KYC Rejected", "success");
    await fetchSubmissions();
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-6">
        <div className="mx-auto max-w-6xl">
          <SkeletonList />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-6">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-100">Admin access required</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your account does not have admin permissions.
          </p>
          <button
            type="button"
            onClick={() => router.push("/meteors")}
            className="mt-5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Back to KYC form
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black px-4 py-6 md:px-8">
      <ToastStack messages={toasts} />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">KYC Admin Dashboard</h1>
            <p className="text-sm text-zinc-400">Review and manage submitted KYC requests.</p>
            {!hasDbAdminRole ? (
              <p className="mt-2 text-xs text-amber-300">
                Read-only mode: app_metadata.role=&apos;admin&apos; is required for Approve/Reject writes.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={fetchSubmissions}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleFilterChange(item.value)}
              aria-pressed={filter === item.value}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === item.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm lg:col-span-1">
            <h2 className="mb-3 px-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Submissions
            </h2>

            {loading ? (
              <SkeletonList />
            ) : filteredSubmissions.length === 0 ? (
              <p className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-400">
                No submissions found for this filter.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((submission) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(submission.id);
                      setRejectionNote(submission.rejection_note || "");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedId === submission.id
                        ? "border-zinc-400 bg-zinc-800"
                        : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                    }`}
                  >
                    <p className="font-medium text-zinc-100">{submission.full_name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusBadge status={submission.status} />
                      <span className="text-xs text-zinc-500">{formatDate(submission.submitted_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm lg:col-span-2">
            {!selectedSubmission ? (
              <p className="text-sm text-zinc-400">Select a submission to see details.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-100">{selectedSubmission.full_name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Submitted on {formatDate(selectedSubmission.submitted_at)}
                    </p>
                  </div>
                  <StatusBadge status={selectedSubmission.status} />
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl bg-zinc-950 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Aadhaar Number</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{selectedSubmission.aadhaar_number}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">PAN Number</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{selectedSubmission.pan_number}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-300">Documents</p>
                  <DocumentViewer documentUrls={selectedSubmission.document_urls || []} />
                </div>

                <div className="rounded-2xl border border-zinc-700 p-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Rejection note</label>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={4}
                    placeholder="Add a reason if you reject this submission"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={actionLoading !== null || !hasDbAdminRole}
                    onClick={() => updateStatus("approved")}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading === "approved" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading !== null || !hasDbAdminRole}
                    onClick={() => updateStatus("rejected")}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {actionLoading === "rejected" ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
