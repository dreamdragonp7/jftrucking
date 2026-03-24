import type { Metadata } from "next";
import { LoginForm } from "@/components/shared/LoginForm";

export const metadata: Metadata = {
  title: "Subcontractor Login | J Fudge Trucking",
};

export default function SubcontractorLoginPage() {
  return <LoginForm portalType="subcontractor" />;
}
