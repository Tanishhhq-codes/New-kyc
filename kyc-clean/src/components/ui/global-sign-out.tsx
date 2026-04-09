"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const hiddenPaths = new Set(["/login", "/auth/callback"]);

export function GlobalSignOut() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    if (hiddenPaths.has(pathname)) return true;
    return pathname.startsWith("/auth/");
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    if (shouldHide) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setIsSignedIn(Boolean(session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsSignedIn(Boolean(session));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [shouldHide]);

  if (shouldHide || !isSignedIn) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-40">
      <button
        onClick={async () => {
          setLoading(true);
          try {
            await supabase.auth.signOut();
            router.replace("/login");
          } finally {
            setLoading(false);
          }
        }}
        className="rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-200 shadow-sm backdrop-blur transition hover:bg-zinc-800"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
