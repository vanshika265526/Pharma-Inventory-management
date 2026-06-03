"use client";

import { useEffect, useState } from "react";
import { SellerNav } from "@/components/SellerNav";
import { formatInr } from "@/lib/format";
import { Unit } from "@prisma/client";
import { UNIT_DETAILS } from "@/lib/conversion";

export default function SellerQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotation");
      if (!res.ok) throw new Error("Failed to fetch past quotations");
      const data = await res.json();
      setQuotations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SellerNav />
      
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">My Placed Quotations</h1>
            <p className="text-sm text-slate-400">Monitor all requests, view items details, and check approval statuses.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center p-6">
              <p className="text-slate-400 mb-2">No quotations submitted yet.</p>
              <a
                href="/dashboard"
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Go to Order Desk and build your first quote
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {quotations.map((q) => (
                <div 
                  key={q.id} 
                  className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-mono text-slate-500">QUOTATION ID: {q.id}</div>
                      <div className="text-xs text-slate-400 mt-1">Submitted on {new Date(q.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                      <div className="text-sm font-semibold text-emerald-400">
                        Total Value: <span className="text-base font-bold text-white">{formatInr(q.totalInr)}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        q.status === "PENDING" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
                        q.status === "APPROVED" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                        "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/40 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Requested Items</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {q.items.map((item: any, idx: number) => {
                        const baseUnitSymbol = UNIT_DETAILS[item.product.baseUnit as Unit]?.symbol || item.product.baseUnit.toLowerCase();
                        const orderUnitSymbol = UNIT_DETAILS[item.unit as Unit]?.symbol || item.unit.toLowerCase();

                        return (
                          <div 
                            key={idx} 
                            className="flex flex-col justify-between rounded-lg bg-slate-950/40 p-4.5 border border-slate-800/40 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-white text-sm">{item.product.name}</div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{item.product.sku}</div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t border-slate-800/40 pt-2 text-xs">
                              <span className="text-slate-500">Requested:</span>
                              <span className="font-medium text-slate-200">
                                {item.quantity} {orderUnitSymbol}
                              </span>
                            </div>

                            <div className="flex justify-between items-end text-xs">
                              <span className="text-slate-500">Unit Price (INR):</span>
                              <span className="font-medium text-emerald-400">
                                {formatInr(item.priceInr)} / {baseUnitSymbol}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
