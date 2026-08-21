"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  Pencil,
  Plus,
  Trash2,
  X,
  Sparkles,
  AlertTriangle,
  Package,
  TrendingDown,
  CheckCircle2,
  Bot,
  Send,
  Lightbulb,
  Boxes,
  Truck,
  Coins,
} from "lucide-react";
import FormattedMarkdown from "@/components/FormattedMarkdown";
import { ApiError, apiFetcher, apiRequest } from "@/lib/api-client";
import { useDataStore, type Product, type ProductInput } from "@/lib/data-store";
import { formatRupiah } from "@/lib/formatters";
import type {
  ApiResponse,
  InventoryForecastData,
  InventoryQueryData,
  StockStatus,
} from "@/lib/api-types";

interface ProductForm {
  name: string;
  category: string;
  price: string;
  image: string;
  specs: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "",
  price: "",
  image: "",
  specs: "",
  description: "",
  isActive: true,
};

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Operasi produk gagal diproses.";
}

export default function AdminProdukPage() {
  const { products, isLoading, error, addProduct, updateProduct, deleteProduct } =
    useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // AI Pharmacy Inventory & Restock Forecasting Data
  const {
    data: inventoryResponse,
    isLoading: inventoryLoading,
  } = useSWR<ApiResponse<InventoryForecastData>>(
    "/api/ai/inventory/forecast",
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const [inventoryQuestion, setInventoryQuestion] = useState("");
  const [inventoryAnswer, setInventoryAnswer] = useState<string | null>(null);
  const [isAskingInventory, setIsAskingInventory] = useState(false);

  const forecast = inventoryResponse?.data;

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActionError(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActionError(null);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      image: product.image ?? "",
      specs: product.specs ?? "",
      description: product.description ?? "",
      isActive: product.isActive,
    });
    setActionError(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setIsSaving(true);

    const input: ProductInput = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      image: form.image.trim() || null,
      specs: form.specs.trim() || null,
      description: form.description.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await updateProduct(editingId, input);
      } else {
        await addProduct(input);
      }
      closeForm();
    } catch (submitError) {
      setActionError(errorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    setIsSaving(true);
    try {
      await deleteProduct(id);
      setDeleteConfirm(null);
    } catch (deleteError) {
      setActionError(errorMessage(deleteError));
      setDeleteConfirm(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskInventory = async (queryText?: string) => {
    const q = (queryText || inventoryQuestion).trim();
    if (!q || isAskingInventory) return;

    setIsAskingInventory(true);
    setInventoryAnswer(null);

    try {
      const res = await apiRequest<ApiResponse<InventoryQueryData>>(
        "/api/ai/inventory/query",
        {
          method: "POST",
          body: { query: q },
        },
      );
      setInventoryAnswer(res?.data?.answer || "AI Inventory Advisor sedang memperbarui data.");
    } catch (err: any) {
      setInventoryAnswer(`Gagal memproses pertanyaan: ${err?.message || "Terjadi kesalahan pada AI Service"}`);
    } finally {
      setIsAskingInventory(false);
    }
  };

  const updateField = (field: keyof ProductForm, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const getStatusBadge = (status: StockStatus, runoutDays: number) => {
    if (status === "CRITICAL_REFILL") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-700">
          <AlertTriangle className="h-3 w-3" />
          Kritis ({runoutDays} hr)
        </span>
      );
    }
    if (status === "REORDER_RECOMMENDED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          <TrendingDown className="h-3 w-3" />
          Restock ({runoutDays} hr)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Aman ({runoutDays} hr)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">
            Produk & Gudang Farmasi
          </h1>
          <p className="mt-1 text-sm text-[#6B7C72]">
            Kelola katalog obat/alat dan peramalan kebutuhan stok otomatis berbasis AI.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A4A38] shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {(error || (actionError && !showForm)) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {actionError ?? error}
        </p>
      )}

      {/* AI Pharmacy Inventory & Restock Forecasting Agent Card */}
      <div className="rounded-2xl border border-[#0D5C46]/20 bg-gradient-to-br from-[#FAF8F5] via-white to-emerald-50/30 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D5C46] text-white shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#0D5C46]">
                  AI Pharmacy Inventory & Restock Forecasting
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <Sparkles className="h-3 w-3" /> Demand AI
                </span>
              </div>
              <p className="text-xs text-[#6B7C72]">
                Menganalisis sinyal keluhan pasien di konsultasi untuk memproyeksikan sisa hari stok & rekomendasi restock (EOQ).
              </p>
            </div>
          </div>
          {forecast?.generatedAt && (
            <span className="text-[11px] text-[#6B7C72] font-medium self-start sm:self-auto">
              Diperbarui: {new Date(forecast.generatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white border border-[#EAE4DC] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C72]">
                Stok Kritis
              </span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-red-600">
              {inventoryLoading ? "..." : forecast?.summary.criticalItemsCount ?? 0}
              <span className="text-xs font-normal text-gray-500 ml-1">produk</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Sisa stok &lt; 7 hari</p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAE4DC] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C72]">
                Perlu Restock
              </span>
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {inventoryLoading ? "..." : forecast?.summary.reorderRecommendedCount ?? 0}
              <span className="text-xs font-normal text-gray-500 ml-1">produk</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Sisa stok 7-14 hari</p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAE4DC] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C72]">
                Stok Aman
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              {inventoryLoading ? "..." : forecast?.summary.healthyItemsCount ?? 0}
              <span className="text-xs font-normal text-gray-500 ml-1">produk</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Sisa stok &gt; 14 hari</p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAE4DC] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C72]">
                Anggaran PO Restock
              </span>
              <Coins className="h-4 w-4 text-[#E07A5F]" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-[#0D5C46] truncate">
              {inventoryLoading
                ? "..."
                : formatRupiah(forecast?.summary.totalEstimatedReorderBudget ?? 0)}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Estimasi kebutuhan modal PO</p>
          </div>
        </div>

        {/* Narrative Procurement Advice */}
        {forecast?.aiExecutiveAdvice && (
          <div className="rounded-xl bg-white border border-emerald-900/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D5C46] uppercase tracking-wider">
              <Truck className="h-4 w-4 text-[#0D5C46]" />
              <span>Saran Pengadaan & Strategi Distributor (AI):</span>
            </div>
            <div className="mt-1">
              <FormattedMarkdown content={forecast.aiExecutiveAdvice.procurementSummary} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#EAE4DC]">
                <div className="text-[10px] font-bold uppercase text-[#0D5C46] mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-[#E07A5F]" />
                  Aksi Prioritas Gudang:
                </div>
                <ul className="space-y-1 text-xs text-gray-600">
                  {forecast.aiExecutiveAdvice.priorityActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#0D5C46] font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#EAE4DC]">
                <div className="text-[10px] font-bold uppercase text-[#0D5C46] mb-1.5 flex items-center gap-1">
                  <Package className="h-3 w-3 text-[#0D5C46]" />
                  Strategi Pembelian Supplier:
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {forecast.aiExecutiveAdvice.supplierStrategy}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Pharmacy Advisor Q&A */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0D5C46]">
            <Bot className="h-4 w-4" />
            <span>Tanya AI Inventory & Procurement Advisor:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "Kapan kita harus pesan ulang strip glukometer?",
              "Berapa estimasi kebutuhan modal restock bulan ini?",
              "Produk obat apa yang paling banyak dicari pasien minggu ini?",
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInventoryQuestion(preset);
                  handleAskInventory(preset);
                }}
                disabled={isAskingInventory}
                className="cursor-pointer rounded-lg bg-white hover:bg-[#0D5C46]/10 border border-[#EAE4DC] px-2.5 py-1 text-[11px] font-medium text-[#4A5D53] transition-colors"
              >
                💡 {preset}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskInventory();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inventoryQuestion}
              onChange={(e) => setInventoryQuestion(e.target.value)}
              placeholder="Tanyakan status stok, lead time pengiriman, atau rekomendasi PO..."
              className="flex-1 rounded-xl border border-[#EAE4DC] bg-white px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-[#0D5C46] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inventoryQuestion.trim() || isAskingInventory}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D5C46] hover:bg-[#0A4A38] disabled:bg-gray-200 text-white px-4 py-2 text-xs font-bold transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isAskingInventory ? "Menganalisis..." : "Tanya"}</span>
            </button>
          </form>

          {inventoryAnswer && (
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/60 p-3.5 text-xs text-[#1A2421] leading-relaxed animate-in fade-in space-y-1.5">
              <div className="font-bold text-[#0D5C46] mb-1 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" /> Jawaban Asisten Pengadaan AI:
              </div>
              <FormattedMarkdown content={inventoryAnswer} />
            </div>
          )}
        </div>
      </div>

      {/* Main Products Catalog Table */}
      <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EAE4DC] bg-[#FAF8F5]">
                {[
                  "Nama Produk & Sinyal AI",
                  "Kategori",
                  "Harga",
                  "Proyeksi Stok AI",
                  "Saran PO (EOQ)",
                  "Status",
                  "Aksi",
                ].map((label) => (
                  <th
                    key={label}
                    className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#6B7C72] ${
                      label === "Aksi" ? "text-right" : ""
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {products.map((product) => {
                const invItem = forecast?.items.find(
                  (i) => i.productId === product.id || i.productName.toLowerCase() === product.name.toLowerCase(),
                );

                return (
                  <tr key={product.id} className="transition-colors hover:bg-[#FAF8F5]/50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                      {invItem?.demandSignalReasons && invItem.demandSignalReasons.length > 0 ? (
                        <p className="mt-0.5 text-[11px] text-[#0D5C46] font-medium line-clamp-1">
                          📊 {invItem.demandSignalReasons[0]}
                        </p>
                      ) : (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#6B7C72]">
                          {product.specs || "Tanpa spesifikasi"}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-[#4A5D53]">{product.category}</td>
                    <td className="px-5 py-4 text-sm font-bold text-[#0D5C46]">
                      {formatRupiah(product.price)}
                    </td>
                    <td className="px-5 py-4">
                      {invItem ? (
                        getStatusBadge(invItem.stockStatus, invItem.runoutDays)
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-[#1A2421]">
                      {invItem ? (
                        <div>
                          <span className="font-bold text-[#0D5C46]">{invItem.recommendedReorderQty} unit</span>
                          <span className="block text-[10px] text-gray-400">
                            (Est. {formatRupiah(invItem.estimatedReorderCost)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          product.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          aria-label={`Edit ${product.name}`}
                          onClick={() => openEdit(product)}
                          className="cursor-pointer rounded-lg p-2 text-[#6B7C72] transition-colors hover:bg-[#0D5C46]/10 hover:text-[#0D5C46]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Hapus ${product.name}`}
                          onClick={() => setDeleteConfirm(product.id)}
                          className="cursor-pointer rounded-lg p-2 text-[#6B7C72] transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-[#F2ECE4] md:hidden">
          {products.map((product) => {
            const invItem = forecast?.items.find(
              (i) => i.productId === product.id || i.productName.toLowerCase() === product.name.toLowerCase(),
            );

            return (
              <div key={product.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                    <p className="text-xs text-[#6B7C72]">{product.category}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#0D5C46]">
                    {formatRupiah(product.price)}
                  </span>
                </div>
                {invItem && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                    <div>{getStatusBadge(invItem.stockStatus, invItem.runoutDays)}</div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      Saran PO: <strong className="text-[#0D5C46]">{invItem.recommendedReorderQty} unit</strong>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => openEdit(product)}
                    className="cursor-pointer text-xs font-semibold text-[#0D5C46] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="cursor-pointer text-xs font-semibold text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">
            Memuat produk & inventaris...
          </div>
        )}
        {!isLoading && products.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">
            Belum ada produk. Klik &quot;Tambah Produk&quot; untuk menambahkan.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1A2421]">Hapus Produk?</h2>
            <p className="text-sm text-[#6B7C72]">Data ini akan dihapus permanen dari database.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isSaving}
                className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isSaving}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {isSaving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE4DC] px-6 py-4">
              <h2 className="text-lg font-bold text-[#0D5C46]">
                {editingId ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <button
                aria-label="Tutup formulir"
                onClick={closeForm}
                className="cursor-pointer rounded-lg p-1 text-[#6B7C72] hover:bg-[#FAF8F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {actionError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  {actionError}
                </p>
              )}
              <FormField label="Nama Produk">
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="form-input"
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Kategori">
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.category}
                    onChange={(event) => updateField("category", event.target.value)}
                    className="form-input"
                  />
                </FormField>
                <FormField label="Harga (Rupiah)">
                  <input
                    required
                    type="number"
                    min={0}
                    max={2000000000}
                    step={1}
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    placeholder="100000"
                    className="form-input"
                  />
                </FormField>
              </div>
              <FormField label="URL Gambar">
                <input
                  maxLength={500}
                  value={form.image}
                  onChange={(event) => updateField("image", event.target.value)}
                  placeholder="/images/product.png"
                  className="form-input"
                />
              </FormField>
              <FormField label="Spesifikasi">
                <input
                  maxLength={2000}
                  value={form.specs}
                  onChange={(event) => updateField("specs", event.target.value)}
                  className="form-input"
                />
              </FormField>
              <FormField label="Deskripsi">
                <textarea
                  maxLength={5000}
                  rows={3}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="form-input resize-none"
                />
              </FormField>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#3A4F46]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateField("isActive", event.target.checked)}
                  className="h-4 w-4 accent-[#0D5C46]"
                />
                Tampilkan produk di katalog publik
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 cursor-pointer rounded-xl bg-[#0D5C46] py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {isSaving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-[#3A4F46]">{label}</span>
      {children}
    </label>
  );
}
