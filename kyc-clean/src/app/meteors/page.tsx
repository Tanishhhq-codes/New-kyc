"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { KycForm } from "@/components/ui/kyc-form";
import { StatusBadge } from "@/components/kyc/status-badge";

type UserKycRow = {
  id: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  submitted_at: string;
  rejection_note: string | null;
};

const statusLabel: Record<UserKycRow["status"], string> = {
  pending: "Pending Review",
  under_review: "Under Review",
  approved: "Approved ✅",
  rejected: "Rejected ❌",
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-8 md:px-8">
      <div className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
      <div className="h-[440px] animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
      <div className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
    </div>
  );
}

export default function MeteorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [kycStatus, setKycStatus] = useState<UserKycRow | null>(null);

  const fetchLatestKycStatus = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select("id,status,submitted_at,rejection_note")
      .eq("user_id", id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch user KYC status:", error);
      return;
    }

    setKycStatus((data as UserKycRow | null) || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "user");
      await fetchLatestKycStatus(user.id);
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [fetchLatestKycStatus, router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`kyc-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kyc_submissions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchLatestKycStatus(userId);
        }
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      fetchLatestKycStatus(userId);
    }, 12000);

    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchLatestKycStatus, userId]);

  const bottomStatusLabel = useMemo(() => {
    if (!kycStatus) return "No submission yet";
    return statusLabel[kycStatus.status];
  }, [kycStatus]);

  if (loading) {
    return (
      <AuroraBackground>
        <DashboardSkeleton />
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-8 md:px-8">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl backdrop-blur">
          <p className="text-sm text-zinc-300 md:text-base">
            Hello, <span className="font-semibold text-zinc-100">{userEmail}</span> 👋 Welcome to KYC Verification Site
          </p>
        </section>

        <KycForm onSubmitted={() => userId && fetchLatestKycStatus(userId)} />

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Live KYC Status</p>
          <div className="mt-2 flex items-center gap-3">
            {kycStatus ? <StatusBadge status={kycStatus.status} /> : null}
            <p className="text-sm font-medium text-zinc-100">{bottomStatusLabel}</p>
          </div>
          {kycStatus?.submitted_at ? (
            <p className="mt-1 text-xs text-zinc-400">
              Last submitted: {new Date(kycStatus.submitted_at).toLocaleString("en-IN")}
            </p>
          ) : null}
          {kycStatus?.status === "rejected" && kycStatus.rejection_note ? (
            <p className="mt-2 text-xs text-rose-300">Reason: {kycStatus.rejection_note}</p>
          ) : null}
        </section>
      </div>
    </AuroraBackground>
  );
}
