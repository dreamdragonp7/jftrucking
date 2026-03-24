import type { Metadata } from "next";
import { LoginForm } from "@/components/shared/LoginForm";

export const metadata: Metadata = {
  title: "Trucker Login",
};

export default function TruckerLoginPage() {
  return <LoginForm portalType="trucker" />;
}
