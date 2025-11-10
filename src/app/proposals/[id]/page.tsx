import React from "react";
import ProposalDetailClient from "./ProposalDetailClient";

// Generate static params for static export
export async function generateStaticParams() {
  // For static export, we'll generate a few example proposal IDs
  // In a real app, you'd fetch this from your API or contract
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }];
}

export default function ProposalDetailPage() {
  return <ProposalDetailClient />;
}
