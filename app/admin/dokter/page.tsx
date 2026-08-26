"use client";

import React, { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useDataStore, type Doctor, type DoctorInput } from "@/lib/data-store";

interface DoctorForm {
  name: string;
  specialty: string;
  experience: string;
  registrationNumber: string;
  image: string;
  isActive: boolean;
  categoryIds: string[];
}

const EMPTY_FORM: DoctorForm = {
  name: "",
  specialty: "",
  experience: "",
  registrationNumber: "",
  image: "",
  isActive: true,
  categoryIds: [],
};

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Operasi data dokter gagal diproses.";
}

export default function AdminDokterPage() {
  const {
    doctors,
    categories,
    isLoading,
    error,
    addDoctor,
    updateDoctor,
    deleteDoctor,
  } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
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

  const openEdit = (doctor: Doctor) => {
    setEditingId(doctor.id);
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      experience: doctor.experience,
      registrationNumber: doctor.registrationNumber ?? "",
      image: doctor.image ?? "",
      isActive: doctor.isActive,
      categoryIds: doctor.categories.map((category) => category.id),
    });
    setActionError(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.categoryIds.length === 0) {
      setActionError("Pilih minimal satu bidang keahlian.");
      return;
    }

    setActionError(null);
    setIsSaving(true);
    const input: DoctorInput = {
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      experience: form.experience.trim(),
      registrationNumber: form.registrationNumber.trim() || null,
      image: form.image.trim() || null,
      isActive: form.isActive,
      categoryIds: form.categoryIds,
    };

    try {
      if (editingId) {
        await updateDoctor(editingId, input);
      } else {
        await addDoctor(input);
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
      await deleteDoctor(id);
      setDeleteConfirm(null);
    } catch (deleteError) {
      setActionError(errorMessage(deleteError));
      setDeleteConfirm(null);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof DoctorForm, value: string | boolean | string[]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    updateField(
      "categoryIds",
      form.categoryIds.includes(categoryId)
        ? form.categoryIds.filter((id) => id !== categoryId)
        : [...form.categoryIds, categoryId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">Dokter Spesialis</h1>
          <p className="mt-1 text-sm text-[#6B7C72]">Kelola dokter spesialis dan bidang keahliannya di database.</p>
        </div>
        <button onClick={openCreate} disabled={categories.length === 0} className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A4A38] disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Dokter</span>
        </button>
      </div>

      {(error || (actionError && !showForm)) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{actionError ?? error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EAE4DC] bg-[#FAF8F5]">
                {['Nama Dokter', 'Spesialisasi', 'Pengalaman', 'Status', 'Aksi'].map((label) => (
                  <th key={label} className={`px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#6B7C72] ${label === 'Aksi' ? 'text-right' : ''}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {doctors.map((doctor) => (
                <tr key={doctor.id} className="transition-colors hover:bg-[#FAF8F5]/50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#1A2421]">{doctor.name}</p>
                    <p className="mt-0.5 text-xs text-[#6B7C72]">{doctor.registrationNumber || "No. registrasi belum diisi"}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#4A5D53]">
                    <p>{doctor.specialty}</p>
                    <p className="mt-1 text-xs text-[#6B7C72]">{doctor.categories.map((category) => category.name).join(", ")}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6B7C72]">{doctor.experience}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${doctor.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{doctor.isActive ? "Aktif" : "Nonaktif"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button aria-label={`Edit ${doctor.name}`} onClick={() => openEdit(doctor)} className="cursor-pointer rounded-lg p-2 text-[#6B7C72] hover:bg-[#0D5C46]/10 hover:text-[#0D5C46]"><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Hapus ${doctor.name}`} onClick={() => setDeleteConfirm(doctor.id)} className="cursor-pointer rounded-lg p-2 text-[#6B7C72] hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#F2ECE4] md:hidden">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="space-y-2 p-4">
              <p className="text-sm font-semibold text-[#1A2421]">{doctor.name}</p>
              <p className="text-xs text-[#6B7C72]">{doctor.specialty} · {doctor.experience}</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => openEdit(doctor)} className="cursor-pointer text-xs font-semibold text-[#0D5C46] hover:underline">Edit</button>
                <button onClick={() => setDeleteConfirm(doctor.id)} className="cursor-pointer text-xs font-semibold text-red-500 hover:underline">Hapus</button>
              </div>
            </div>
          ))}
        </div>
        {isLoading && <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">Memuat dokter...</div>}
        {!isLoading && doctors.length === 0 && <div className="px-6 py-12 text-center text-sm text-[#6B7C72]">Belum ada dokter.</div>}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1A2421]">Hapus Dokter?</h2>
            <p className="text-sm text-[#6B7C72]">Data ini akan dihapus permanen dari database.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSaving ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE4DC] px-6 py-4">
              <h2 className="text-lg font-bold text-[#0D5C46]">{editingId ? "Edit Dokter" : "Tambah Dokter Baru"}</h2>
              <button aria-label="Tutup formulir" onClick={closeForm} className="cursor-pointer rounded-lg p-1 text-[#6B7C72] hover:bg-[#FAF8F5]"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {actionError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{actionError}</p>}
              <FormField label="Nama Dokter"><input required minLength={2} maxLength={160} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="dr. Nama Lengkap, Sp.PD" className="form-input" /></FormField>
              <FormField label="Spesialisasi"><input required minLength={2} maxLength={180} value={form.specialty} onChange={(event) => updateField("specialty", event.target.value)} className="form-input" /></FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Pengalaman"><input required minLength={2} maxLength={100} value={form.experience} onChange={(event) => updateField("experience", event.target.value)} placeholder="10+ Tahun" className="form-input" /></FormField>
                <FormField label="No. Registrasi"><input maxLength={120} value={form.registrationNumber} onChange={(event) => updateField("registrationNumber", event.target.value)} placeholder="STR/SIP" className="form-input" /></FormField>
              </div>
              <FormField label="URL Foto"><input maxLength={500} value={form.image} onChange={(event) => updateField("image", event.target.value)} placeholder="/images/doctor.png" className="form-input" /></FormField>
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold uppercase tracking-wider text-[#3A4F46]">Bidang Keahlian</legend>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.categoryIds.includes(category.id) ? 'border-[#0D5C46] bg-[#0D5C46] text-white' : 'border-[#DDD8D0] bg-white text-[#4A5D53] hover:border-[#0D5C46]'}`}>{category.name}</button>
                  ))}
                </div>
              </fieldset>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#3A4F46]">
                <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} className="h-4 w-4 accent-[#0D5C46]" />
                Tampilkan dokter di katalog publik
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} disabled={isSaving} className="flex-1 cursor-pointer rounded-xl border border-[#EAE4DC] py-2.5 text-sm font-semibold text-[#4A5D53]">Batal</button>
                <button type="submit" disabled={isSaving} className="flex-1 cursor-pointer rounded-xl bg-[#0D5C46] py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSaving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Dokter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#3A4F46]">{label}</span>{children}</label>;
}
