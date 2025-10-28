import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Full-bleed wrapper to bypass global sidebar containers
  return (
    <div className="min-h-dvh w-screen overflow-hidden">
      {children}
    </div>
  );
}
