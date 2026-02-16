import React from "react";
import ProposalDetailClient from "./ProposalDetailClient";

// Dynamic rendering — proposal IDs come from on-chain data
export async function generateStaticParams() {
  // Return empty array so all proposal detail pages are dynamically rendered
  return [];
}

export default function ProposalDetailPage() {
  return <ProposalDetailClient />;
}
