import React from "react";
import ProposalDetailClient from "./ProposalDetailClient";

// Dynamic rendering — proposal IDs come from on-chain data
// For static export, we generate a single fallback page that handles all proposal IDs client-side
export async function generateStaticParams() {
  // Generate a single fallback page - all proposal IDs will be handled client-side
  return [{ id: '0' }];
}

export default function ProposalDetailPage() {
  return <ProposalDetailClient />;
}
