"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "ADMIN") {
        router.push("/admin/products");
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push("/login");
    }
  }, [status, session, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
    </div>
  );
}
