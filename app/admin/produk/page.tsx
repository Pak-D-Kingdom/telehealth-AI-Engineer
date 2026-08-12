"use client";

import React, { useState } from "react";
import { useDataStore, type Product } from "@/lib/data-store";
import { Plus, Pencil, Trash2, X } from "lucide-react";

type FormData = Omit<Product, "id">;

const EMPTY_FORM: FormData = {
  name: "",
  category: "",
  price: "",
  image: "",
  specs: "",
  description: "",
};

export default function AdminProdukPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
      specs: product.specs,
      description: product.description,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProduct(editingId, form);
    } else {
      addProduct(form);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteConfirm(null);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0D5C46] tracking-tight">
            Produk & Alat
          </h1>
          <p className="text-sm text-[#6B7C72] mt-1">
            Kelola data produk, obat, dan alat kesehatan
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#0D5C46] hover:bg-[#0A4A38] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Produk</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EAE4DC] bg-[#FAF8F5]">
                <th className="px-6 py-3 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-3 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">Harga</th>
                <th className="px-6 py-3 text-xs font-bold text-[#6B7C72] uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                    <p className="text-xs text-[#6B7C72] mt-0.5 line-clamp-1">{product.specs}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#4A5D53]">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#0D5C46]">{product.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2 rounded-lg hover:bg-[#0D5C46]/10 text-[#6B7C72] hover:text-[#0D5C46] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#6B7C72] hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-[#F2ECE4]">
          {products.map((product) => (
            <div key={product.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                  <p className="text-xs text-[#6B7C72]">{product.category}</p>
                </div>
                <span className="text-sm font-bold text-[#0D5C46]">{product.price}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openEdit(product)}
                  className="text-xs font-semibold text-[#0D5C46] hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(product.id)}
                  className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">
            Belum ada produk. Klik &quot;Tambah Produk&quot; untuk menambahkan.
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#1A2421]">Hapus Produk?</h3>
            <p className="text-sm text-[#6B7C72]">
              Data produk ini akan dihapus secara permanen.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EAE4DC] text-sm font-semibold text-[#4A5D53] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-12 pb-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4DC]">
              <h3 className="text-lg font-bold text-[#0D5C46]">
                {editingId ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#6B7C72] hover:text-[#1A2421] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">Nama Produk</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">Harga</label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder="Rp 100.000"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">URL Gambar</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder="/images/product.png"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">Spesifikasi</label>
                <input
                  type="text"
                  value={form.specs}
                  onChange={(e) => updateField("specs", e.target.value)}
                  placeholder="Komposisi atau spec dipisah dengan •"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3A4F46] uppercase tracking-wider">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C46]/30 focus:border-[#0D5C46] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAE4DC] text-sm font-semibold text-[#4A5D53] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0D5C46] hover:bg-[#0A4A38] text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  {editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
