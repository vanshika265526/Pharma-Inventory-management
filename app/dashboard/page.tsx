"use client";

import { useEffect, useState } from "react";
import { SellerNav } from "@/components/SellerNav";
import { formatInr } from "@/lib/format";
import { convertQuantity, calculateLivePrice, getCompatibleUnits, UNIT_DETAILS } from "@/lib/conversion";
import { Unit } from "@prisma/client";
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, CheckIcon, ClipboardIcon } from "@radix-ui/react-icons";

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

interface CartItem {
  product: Product;
  quantity: number;
  unit: Unit;
  livePrice: number;
}

export default function SellerDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);

  // Product Selection States
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [unitInputs, setUnitInputs] = useState<Record<string, Unit>>({});

  // Cart / Quotation Builder
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch product catalog");
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
      
      // Extract unique categories
      const cats: string[] = Array.from(
        new Set(data.map((p: Product) => p.category).filter(Boolean))
      );
      setCategories(cats);

      // Initialize default quantities and units
      const initialQtys: Record<string, string> = {};
      const initialUnits: Record<string, Unit> = {};
      data.forEach((p: Product) => {
        initialQtys[p.id] = "1";
        initialUnits[p.id] = p.baseUnit;
      });
      setQtyInputs(initialQtys);
      setUnitInputs(initialUnits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Search and Category Filter
  useEffect(() => {
    let result = products;

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== "ALL") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(result);
  }, [search, categoryFilter, products]);

  const handleQtyChange = (productId: string, val: string) => {
    setQtyInputs((prev) => ({ ...prev, [productId]: val }));
  };

  const handleUnitChange = (productId: string, unit: Unit) => {
    setUnitInputs((prev) => ({ ...prev, [productId]: unit }));
  };

  const handleAddToCart = (product: Product) => {
    const qtyVal = parseFloat(qtyInputs[product.id]);
    const selectedUnit = unitInputs[product.id];

    if (isNaN(qtyVal) || qtyVal <= 0) {
      alert("Please enter a valid quantity greater than zero.");
      return;
    }

    // Check if enough stock exists in base unit
    const neededBaseQty = convertQuantity(qtyVal, selectedUnit, product.baseUnit);
    const availableStock = product.inventory?.quantity || 0;

    if (neededBaseQty > availableStock) {
      alert(`Warning: Requested quantity (${neededBaseQty} ${product.baseUnit}) exceeds available inventory (${availableStock} ${product.baseUnit}). You can still request a quotation, but admin approval depends on stock levels.`);
    }

    const price = calculateLivePrice(qtyVal, selectedUnit, product.baseUnit, Number(product.basePriceInr));

    // Add or merge item in cart
    setCart((prevCart) => {
      const idx = prevCart.findIndex(
        (item) => item.product.id === product.id && item.unit === selectedUnit
      );

      if (idx > -1) {
        const updated = [...prevCart];
        const newQty = updated[idx].quantity + qtyVal;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          livePrice: calculateLivePrice(newQty, selectedUnit, product.baseUnit, Number(product.basePriceInr)),
        };
        return updated;
      } else {
        return [...prevCart, { product, quantity: qtyVal, unit: selectedUnit, livePrice: price }];
      }
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmitQuotation = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const payload = {
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    try {
      const res = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quotation");
      }

      setSuccessMsg(`Quotation successfully created! ID: ${data.quotationId}`);
      setCart([]);
      fetchProducts(); // Refresh products to check stock (if modified)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.livePrice, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SellerNav />
      
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Product Catalog Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Chemical Order Catalog</h1>
              <p className="text-sm text-slate-400">Search chemical formulations, customize order units, and build pricing quotes.</p>
            </div>

            {/* Filters Header */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search chemicals by name, SKU, or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/40 py-2.5 px-4 text-sm text-white outline-none transition focus:border-emerald-500/50"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
                No matching chemicals found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const selectedUnit = unitInputs[product.id] || product.baseUnit;
                  const qtyVal = parseFloat(qtyInputs[product.id] || "0");
                  const livePrice = calculateLivePrice(qtyVal, selectedUnit, product.baseUnit, Number(product.basePriceInr));
                  const compatibleUnits = getCompatibleUnits(product.baseUnit);
                  const stock = product.inventory?.quantity || 0;

                  return (
                    <div
                      key={product.id}
                      className="group relative rounded-xl border border-slate-800 bg-slate-900/20 p-5 backdrop-blur-sm transition duration-300 hover:border-slate-700/80 hover:bg-slate-900/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white group-hover:text-emerald-400 transition">
                            {product.name}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {product.sku}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                            {product.description}
                          </p>
                        )}

                        {/* Pricing details */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/40 text-xs mb-4">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Base Unit Rate:</span>
                            <span className="font-medium text-emerald-400">
                              {formatInr(product.basePriceInr)} / {product.baseUnit.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Available Stock:</span>
                            <span className="font-medium text-slate-300">
                              {Number(stock).toLocaleString()} {product.baseUnit.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inputs & Order Actions */}
                      <div className="space-y-3 pt-2 border-t border-slate-800/40">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={qtyInputs[product.id] || ""}
                              onChange={(e) => handleQtyChange(product.id, e.target.value)}
                              placeholder="e.g. 5"
                              className="w-full rounded border border-slate-800 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Order Unit
                            </label>
                            <select
                              value={selectedUnit}
                              onChange={(e) => handleUnitChange(product.id, e.target.value as Unit)}
                              className="w-full rounded border border-slate-800 bg-slate-950/80 px-2 py-1.5 text-xs text-white outline-none transition focus:border-emerald-500/50"
                            >
                              {compatibleUnits.map((u) => (
                                <option key={u} value={u}>
                                  {UNIT_DETAILS[u].name} ({UNIT_DETAILS[u].symbol})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Live pricing display */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Rate Calculation</span>
                            <span className="text-sm font-bold text-white">
                              {qtyVal > 0 ? formatInr(livePrice) : "₹0.00"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            className="flex h-8 items-center gap-1 rounded bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600 active:scale-[0.97]"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Column */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 backdrop-blur-sm flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardIcon className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-bold text-white text-lg">Quotation Builder</h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {successMsg && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400 flex items-start gap-2 mb-4 animate-fade-in">
                  <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{successMsg}</div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 mb-4">
                  {error}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center py-12 text-slate-500">
                  <p className="text-sm">Your order list is empty.</p>
                  <p className="text-xs mt-1 text-slate-600">Select items from the catalog and add them to build a quotation.</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-between">
                  {/* Cart Items List */}
                  <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                    {cart.map((item, idx) => (
                      <div
                        key={`${item.product.id}-${item.unit}-${idx}`}
                        className="group flex items-center justify-between border border-slate-800 bg-slate-950/60 p-3 rounded-lg transition hover:border-slate-700"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-white">{item.product.name}</h4>
                          <div className="text-[10px] text-slate-400">
                            Qty: <span className="font-semibold text-slate-200">{item.quantity} {UNIT_DETAILS[item.unit].symbol}</span>
                            {item.unit !== item.product.baseUnit && (
                              <span className="text-[9px] text-slate-500 font-mono ml-1">
                                ({convertQuantity(item.quantity, item.unit, item.product.baseUnit)} {UNIT_DETAILS[item.product.baseUnit].symbol})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-400">
                            {formatInr(item.livePrice)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-500 transition hover:text-red-400 p-1"
                          title="Remove item"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary & Place Order */}
                  <div className="border-t border-slate-800 pt-4 mt-6 space-y-4">
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Items Count:</span>
                        <span className="font-medium text-slate-200">{cart.length}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800/60 pt-2 text-sm">
                        <span className="font-bold text-white">Quotation Total (INR):</span>
                        <span className="font-bold text-emerald-400 text-lg">
                          {formatInr(cartTotal)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitQuotation}
                      disabled={submitting}
                      className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-500/10"
                    >
                      {submitting ? "Submitting Quotation..." : "Place Quotation"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
