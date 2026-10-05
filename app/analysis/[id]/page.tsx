import { notFound } from "next/navigation";
import { loadAnalysisData } from "@/lib/db/load-analysis";
import { AnalysisClient } from "./client";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const data = await loadAnalysisData(id);

  if (!data) {
    notFound();
  }

  return <AnalysisClient initialData={data} />;
}
