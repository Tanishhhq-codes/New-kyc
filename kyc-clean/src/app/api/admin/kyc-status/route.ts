import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type RequestBody = {
  submissionId?: string;
  status?: "approved" | "rejected";
  rejectionNote?: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing in server environment." },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.app_metadata?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin role missing in app_metadata. Re-login required." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const submissionId = body.submissionId;
    const status = body.status;
    const rejectionNote = body.rejectionNote;

    if (!submissionId || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (status === "rejected" && !rejectionNote?.trim()) {
      return NextResponse.json({ error: "Rejection note is required" }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();

    const updatePayload = {
      status,
      rejection_note: status === "rejected" ? rejectionNote?.trim() ?? "" : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    };

    const { data, error } = await adminClient
      .from("kyc_submissions")
      .update(updatePayload)
      .eq("id", submissionId)
      .select("id,status,reviewed_at")
      .single();

    if (error) {
      console.error("Admin API KYC status update failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Admin API unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
