import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/lib/AdminAuthContext";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
