"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/format";
import { Unit } from "@prisma/client";
import { CheckIcon, Cross1Icon, Pencil2Icon } from "@radix-ui/react-icons";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  baseUnit: Unit;
  inventory?: {
    quantity: number;
  };
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Inline edit state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditQty(Number(product.inventory?.quantity || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditQty("");
  };

  const handleSaveStock = async (productId: string) => {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) {
      alert("Please enter a valid non-negative number for quantity.");
      return;
    }

    setSaveLoading(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stock");
      }

      setEditingProductId(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Stock & Inventory Management</h1>
        <p className="text-sm text-slate-400">Monitor and update physical stock levels for all chemicals.</p>
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
      ) : products.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center p-6">
          <p className="text-slate-400">No products found. Please add products to check inventory levels.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Base Unit</th>
                  <th className="px-6 py-4">Stock Level</th>
                  <th className="px-6 py-4 text-right">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((product) => {
                  const isEditing = editingProductId === product.id;
                  const stock = product.inventory?.quantity || 0;
                  
                  // Highlight low stock (less than 10 units/grams/mL/L)
                  const isLowStock = Number(stock) < 100;

                  return (
                    <tr key={product.id} className="transition hover:bg-slate-900/20">
                      <td className="px-6 py-4 font-semibold text-white">{product.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{product.sku}</td>
                      <td className="px-6 py-4">
                        {product.category ? (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{product.baseUnit}</td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-emerald-500/50"
                              autoFocus
                            />
                            <span className="text-xs text-slate-400">{product.baseUnit.toLowerCase()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isLowStock ? "text-amber-400" : "text-white"}`}>
                              {Number(stock).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500">{product.baseUnit.toLowerCase()}</span>
                            {isLowStock && (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                Low Stock
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveStock(product.id)}
                              disabled={saveLoading}
                              className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-50"
                              title="Save Stock Level"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-400 transition hover:bg-slate-700"
                              title="Cancel"
                            >
                              <Cross1Icon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white"
                          >
                            <Pencil2Icon className="w-3.5 h-3.5" />
                            <span>Quick Adjust</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
