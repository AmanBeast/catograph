import { NextResponse } from "next/server";
import { getDashboardAnalyses } from "@/lib/db/analyses";

export async function GET() {
  try {
    const analyses = await getDashboardAnalyses();
    return NextResponse.json(analyses);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load analyses." },
      { status: 500 }
    );
  }
}
