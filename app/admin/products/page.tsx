"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/format";
import { Unit } from "@prisma/client";
import { PlusIcon, Pencil2Icon, TrashIcon, CheckIcon, Cross1Icon } from "@radix-ui/react-icons";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  baseUnit: Unit;
  basePriceInr: number;
  inventory?: {
    quantity: number;
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [baseUnit, setBaseUnit] = useState<Unit>(Unit.GRAM);
  const [basePriceInr, setBasePriceInr] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
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

  const resetForm = () => {
    setName("");
    setSku("");
    setCategory("");
    setDescription("");
    setBaseUnit(Unit.GRAM);
    setBasePriceInr("");
    setInitialStock("");
    setFieldErrors({});
    setEditingProduct(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setCategory(product.category || "");
    setDescription(product.description || "");
    setBaseUnit(product.baseUnit);
    // Convert decimal/number to string
    setBasePriceInr(Number(product.basePriceInr).toString());
    setInitialStock("0"); // initial stock is not editable during edit
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFieldErrors({});
    
    const payload = {
      name,
      sku,
      category: category || undefined,
      description: description || undefined,
      baseUnit,
      basePriceInr: parseFloat(basePriceInr),
      ...(editingProduct ? {} : { initialStock: parseFloat(initialStock || "0") }),
    };

    const url = editingProduct 
      ? `/api/admin/products/${editingProduct.id}`
      : "/api/admin/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && typeof data.error === "object") {
          setFieldErrors(data.error);
        } else {
          setError(data.error || "An error occurred");
        }
      } else {
        setShowModal(false);
        resetForm();
        fetchProducts();
      }
    } catch (err: any) {
      setError("Network error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? All stock levels and inventory references will be removed.")) return;
    
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }

      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Chemical & Product Catalog</h1>
          <p className="text-sm text-slate-400">Add, edit, or remove chemical items and setup pricing.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] shadow-lg shadow-emerald-500/10"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Product</span>
        </button>
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
          <p className="text-slate-400 mb-2">No products found in the catalog.</p>
          <button
            onClick={handleOpenCreate}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            Create your first product now
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Base Unit</th>
                  <th className="px-6 py-4">Base Price (INR)</th>
                  <th className="px-6 py-4">Current Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((product) => (
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
                    <td className="px-6 py-4 font-medium text-slate-300">{product.baseUnit}</td>
                    <td className="px-6 py-4 font-medium text-emerald-400">
                      {formatInr(product.basePriceInr)} <span className="text-xs text-slate-500">/ {product.baseUnit.toLowerCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">
                        {Number(product.inventory?.quantity || 0).toLocaleString()}
                      </span>{" "}
                      <span className="text-xs text-slate-500">{product.baseUnit.toLowerCase()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-400 transition hover:bg-emerald-950/20 hover:text-emerald-400"
                          title="Edit"
                        >
                          <Pencil2Icon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-400 transition hover:bg-red-950/20 hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? "Edit Product Details" : "Create New Product"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <Cross1Icon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Product/Chemical Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ethanol 99%"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g., ETH-99"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                  />
                  {fieldErrors.sku && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.sku[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Solvent"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chemical details, purity specs, safety guidelines..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Base Unit
                  </label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value as Unit)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                  >
                    <option value={Unit.GRAM}>GRAM (g)</option>
                    <option value={Unit.KILOGRAM}>KILOGRAM (kg)</option>
                    <option value={Unit.MILLILITER}>MILLILITER (mL)</option>
                    <option value={Unit.LITER}>LITER (L)</option>
                    <option value={Unit.UNIT}>UNIT (each)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Base Price (INR)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={basePriceInr}
                    onChange={(e) => setBasePriceInr(e.target.value)}
                    placeholder="e.g., 120.00"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                  />
                  {fieldErrors.basePriceInr && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.basePriceInr[0]}</p>
                  )}
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Initial Stock Level
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    placeholder="e.g., 500"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                  />
                  {fieldErrors.initialStock && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.initialStock[0]}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>{submitLoading ? "Saving..." : "Save Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
