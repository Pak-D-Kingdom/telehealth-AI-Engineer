"use client";

import React, { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useDataStore, type Product, type ProductInput } from "@/lib/data-store";
import { formatRupiah } from "@/lib/formatters";

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

  const updateField = (field: keyof ProductForm, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">
            Produk & Alat
          </h1>
          <p className="mt-1 text-sm text-[#6B7C72]">
            Kelola katalog yang tersimpan di PostgreSQL.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A4A38]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Produk</span>
        </button>
      </div>

      {(error || (actionError && !showForm)) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {actionError ?? error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EAE4DC] bg-[#FAF8F5]">
                {['Nama Produk', 'Kategori', 'Harga', 'Status', 'Aksi'].map((label) => (
                  <th
                    key={label}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#6B7C72] ${label === 'Aksi' ? 'text-right' : ''}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {products.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-[#FAF8F5]/50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#6B7C72]">
                      {product.specs || "Tanpa spesifikasi"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#4A5D53]">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#0D5C46]">
                    {formatRupiah(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#F2ECE4] md:hidden">
          {products.map((product) => (
            <div key={product.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                  <p className="text-xs text-[#6B7C72]">{product.category}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[#0D5C46]">
                  {formatRupiah(product.price)}
                </span>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => openEdit(product)} className="cursor-pointer text-xs font-semibold text-[#0D5C46] hover:underline">Edit</button>
                <button onClick={() => setDeleteConfirm(product.id)} className="cursor-pointer text-xs font-semibold text-red-500 hover:underline">Hapus</button>
              </div>
            </div>
          ))}
        </div>

        {isLoading && <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">Memuat produk...</div>}
        {!isLoading && products.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">
            Belum ada produk. Klik &quot;Tambah Produk&quot; untuk menambahkan.
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1A2421]">Hapus Produk?</h2>
            <p className="text-sm text-[#6B7C72]">Data ini akan dihapus permanen dari database.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {isSaving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE4DC] px-6 py-4">
              <h2 className="text-lg font-bold text-[#0D5C46]">
                {editingId ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <button aria-label="Tutup formulir" onClick={closeForm} className="cursor-pointer rounded-lg p-1 text-[#6B7C72] hover:bg-[#FAF8F5]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {actionError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{actionError}</p>}
              <FormField label="Nama Produk">
                <input required minLength={2} maxLength={160} value={form.name} onChange={(event) => updateField("name", event.target.value)} className="form-input" />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Kategori">
                  <input required minLength={2} maxLength={120} value={form.category} onChange={(event) => updateField("category", event.target.value)} className="form-input" />
                </FormField>
                <FormField label="Harga (Rupiah)">
                  <input required type="number" min={0} max={2000000000} step={1} value={form.price} onChange={(event) => updateField("price", event.target.value)} placeholder="100000" className="form-input" />
                </FormField>
              </div>
              <FormField label="URL Gambar">
                <input maxLength={500} value={form.image} onChange={(event) => updateField("image", event.target.value)} placeholder="/images/product.png" className="form-input" />
              </FormField>
              <FormField label="Spesifikasi">
                <input maxLength={2000} value={form.specs} onChange={(event) => updateField("specs", event.target.value)} className="form-input" />
              </FormField>
              <FormField label="Deskripsi">
                <textarea maxLength={5000} rows={3} value={form.description} onChange={(event) => updateField("description", event.target.value)} className="form-input resize-none" />
              </FormField>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#3A4F46]">
                <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} className="h-4 w-4 accent-[#0D5C46]" />
                Tampilkan produk di katalog publik
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]">Batal</button>
                <button type="submit" disabled={isSaving} className="flex-1 cursor-pointer rounded-xl bg-[#0D5C46] py-2.5 text-sm font-bold text-white disabled:opacity-60">
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
