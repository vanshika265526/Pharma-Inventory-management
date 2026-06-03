"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/format";
import { convertQuantity, calculateLivePrice, UNIT_DETAILS } from "@/lib/conversion";
import { Unit } from "@prisma/client";
import { CheckIcon, ClockIcon, BackpackIcon } from "@radix-ui/react-icons";

interface OrderItem {
  id: string;
  quantity: number;
  unit: Unit;
  priceInr: number;
  product: {
    name: string;
    sku: string;
    baseUnit: Unit;
  };
}

interface Order {
  id: string;
  createdAt: string;
  status: string;
  totalInr: number;
  user: {
    email: string;
  };
  items: OrderItem[];
}

interface QuotationItem {
  id: string;
  quantity: number;
  unit: Unit;
  priceInr: number;
  product: {
    name: string;
    sku: string;
    baseUnit: Unit;
  };
}

interface Quotation {
  id: string;
  createdAt: string;
  status: string;
  totalInr: number;
  user: {
    email: string;
  };
  items: QuotationItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"quotations" | "orders">("quotations");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrdersAndQuotations();
  }, []);

  const fetchOrdersAndQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders);
      setQuotations(data.quotations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuotation = async (quotationId: string) => {
    if (!confirm("Are you sure you want to approve this quotation? It will deduct stock and generate a completed order.")) return;
    
    setProcessingId(quotationId);
    try {
      const res = await fetch("/api/admin/orders/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve quotation");
      }

      fetchOrdersAndQuotations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Orders & Quotations</h1>
          <p className="text-sm text-slate-400">Review, verify unit conversions, and approve incoming sales quotations.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("quotations")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "quotations"
              ? "bg-slate-900 text-emerald-400 border border-emerald-500/20 shadow-md shadow-emerald-500/5"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Quotations ({quotations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "orders"
              ? "bg-slate-900 text-blue-400 border border-blue-500/20 shadow-md shadow-blue-500/5"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BackpackIcon className="w-4 h-4" />
          <span>Approved Orders ({orders.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
        </div>
      ) : activeTab === "quotations" ? (
        quotations.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center p-6 text-slate-400">
            No pending quotations found.
          </div>
        ) : (
          <div className="space-y-6">
            {quotations.map((quotation) => (
              <div
                key={quotation.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded tracking-wide">
                        {quotation.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{quotation.id}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-300 mt-1">
                      Submitted by: <span className="text-white">{quotation.user.email}</span>
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end">
                    <span className="text-xs text-slate-400">
                      {new Date(quotation.createdAt).toLocaleString()}
                    </span>
                    <span className="text-lg font-bold text-emerald-400 mt-1">
                      Total: {formatInr(quotation.totalInr)}
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Items List</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/60 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2">Item Name (SKU)</th>
                          <th className="px-4 py-2">Ordered Qty</th>
                          <th className="px-4 py-2">Unit Conversion Proof</th>
                          <th className="px-4 py-2 text-right">Line Total (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 bg-slate-950/20">
                        {quotation.items.map((item) => {
                          const userUnit = item.unit;
                          const baseUnit = item.product.baseUnit;
                          const baseQty = convertQuantity(Number(item.quantity), userUnit, baseUnit);
                          const basePrice = Number(item.priceInr); // price per base unit

                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-medium text-white">
                                {item.product.name}{" "}
                                <span className="text-slate-500 font-mono text-[10px]">({item.product.sku})</span>
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {Number(item.quantity).toLocaleString()}{" "}
                                <span className="text-slate-500">{UNIT_DETAILS[userUnit].symbol}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400">
                                {userUnit !== baseUnit ? (
                                  <span>
                                    {Number(item.quantity)} {UNIT_DETAILS[userUnit].symbol} × {UNIT_DETAILS[userUnit].toBaseFactor} = {baseQty} {UNIT_DETAILS[baseUnit].symbol}
                                    <br />
                                    {baseQty} {UNIT_DETAILS[baseUnit].symbol} × {formatInr(basePrice)}/{UNIT_DETAILS[baseUnit].symbol}
                                  </span>
                                ) : (
                                  <span>
                                    {baseQty} {UNIT_DETAILS[baseUnit].symbol} × {formatInr(basePrice)}/{UNIT_DETAILS[baseUnit].symbol}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-white text-right">
                                {formatInr(Number(item.quantity) * UNIT_DETAILS[userUnit].toBaseFactor * basePrice)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {quotation.status === "PENDING" && (
                  <div className="flex justify-end pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleApproveQuotation(quotation.id)}
                      disabled={processingId === quotation.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span>{processingId === quotation.id ? "Approving..." : "Approve & Place Order"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center p-6 text-slate-400">
          No approved orders found.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/85 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded tracking-wide">
                      {order.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{order.id}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-300 mt-1">
                    Customer Account: <span className="text-white">{order.user.email}</span>
                  </p>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                  <span className="text-lg font-bold text-blue-400 mt-1">
                    Paid: {formatInr(order.totalInr)}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2">Item Name (SKU)</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Rate Proof (Conversion)</th>
                        <th className="px-4 py-2 text-right">Line Total (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 bg-slate-950/10">
                      {order.items.map((item) => {
                        const userUnit = item.unit;
                        const baseUnit = item.product.baseUnit;
                        const baseQty = convertQuantity(Number(item.quantity), userUnit, baseUnit);
                        const basePrice = Number(item.priceInr);

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-white">
                              {item.product.name}{" "}
                              <span className="text-slate-500 font-mono text-[10px]">({item.product.sku})</span>
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {Number(item.quantity).toLocaleString()}{" "}
                              <span className="text-slate-500">{UNIT_DETAILS[userUnit].symbol}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {userUnit !== baseUnit ? (
                                <span>
                                  {Number(item.quantity)} {UNIT_DETAILS[userUnit].symbol} × {UNIT_DETAILS[userUnit].toBaseFactor} = {baseQty} {UNIT_DETAILS[baseUnit].symbol}
                                  <br />
                                  {baseQty} {UNIT_DETAILS[baseUnit].symbol} × {formatInr(basePrice)}/{UNIT_DETAILS[baseUnit].symbol}
                                </span>
                              ) : (
                                <span>
                                  {baseQty} {UNIT_DETAILS[baseUnit].symbol} × {formatInr(basePrice)}/{UNIT_DETAILS[baseUnit].symbol}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-white text-right">
                              {formatInr(Number(item.quantity) * UNIT_DETAILS[userUnit].toBaseFactor * basePrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
