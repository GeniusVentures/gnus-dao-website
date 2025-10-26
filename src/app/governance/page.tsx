import { Metadata } from "next";
import GovernanceClient from "./GovernanceClient";

export const metadata: Metadata = {
  title: "Governance",
  description: "GNUS DAO governance and voting platform - Manage delegation and view governance settings",
};

export default function GovernancePage() {
  return <GovernanceClient />;
}
