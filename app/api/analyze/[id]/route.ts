import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerDbClient } from "@/lib/db/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId, getToken } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Organization context is required." }, { status: 401 });
    }

    const token = await getToken();
    const supabase = await createServerDbClient({ token, orgId });

    const { data, error } = await supabase
      .from("analyses")
      .select("id, status, stage, stage_message, commit_hash, error_message")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error fetching analysis status." },
      { status: 500 }
    );
  }
}
