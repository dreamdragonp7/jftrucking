import type { Metadata } from "next";
import { LoginForm } from "@/components/shared/LoginForm";

export const metadata: Metadata = {
  title: "Customer Login",
};

export default function CustomerLoginPage() {
  return <LoginForm portalType="customer" />;
}
