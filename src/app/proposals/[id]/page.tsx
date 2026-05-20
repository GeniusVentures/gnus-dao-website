import React from "react";
import ProposalDetailClient from "./ProposalDetailClient";

// Pre-render proposal pages 0-50 for static export.
// Any ID beyond this is handled by the _redirects catch-all → /index.html
export async function generateStaticParams() {
  return Array.from({ length: 51 }, (_, i) => ({ id: String(i) }));
}

export default function ProposalDetailPage() {
  return <ProposalDetailClient />;
}
