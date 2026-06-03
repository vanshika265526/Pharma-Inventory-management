"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { ExitIcon, GearIcon } from "@radix-ui/react-icons";
import { ThemeToggle } from "./ThemeToggle";

export function SellerNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10">
              <span className="font-bold text-sm">A</span>
            </div>
            <span className="text-sm font-bold text-white">
              Aasa MedChem Catalog
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold uppercase tracking-wider text-emerald-400 hover:text-white transition"
            >
              Order Desk
            </Link>
            {isAdmin && (
              <Link
                href="/admin/products"
                className="flex items-center gap-1 rounded bg-slate-900 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition"
              >
                <GearIcon className="w-3 h-3" />
                <span>Admin Console</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden flex-col text-right sm:flex">
            <span className="text-xs font-medium text-slate-300">
              {session?.user?.email}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              {(session?.user as any)?.role || "SELLER"}
            </span>
          </div>

          <ThemeToggle />

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:bg-red-950/20 hover:border-red-950/50 hover:text-red-400 shadow-sm"
            title="Log Out"
          >
            <ExitIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
