import type { Metadata } from "next";
import { LoginForm } from "@/components/shared/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return <LoginForm portalType="admin" />;
}
