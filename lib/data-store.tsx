"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  specs: string;
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  str: string;
  image: string;
  categoryIds: string[];
}

interface DataStoreContextType {
  products: Product[];
  doctors: Doctor[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Omit<Product, "id">) => void;
  deleteProduct: (id: string) => void;
  addDoctor: (doctor: Omit<Doctor, "id">) => void;
  updateDoctor: (id: string, doctor: Omit<Doctor, "id">) => void;
  deleteDoctor: (id: string) => void;
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

// ─── Seed Data ──────────────────────────────────────────

const SEED_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "GlucoMeter Pro Digital Kit",
    category: "Alat Cek Gula Darah Digital",
    price: "Rp 189.000",
    image: "/images/glucometer.png",
    specs: "Kit Digital • 50 Strip Cek • 50 Jarum Lancet • Garansi 1 Tahun",
    description: "Kit lengkap cek kadar gula darah puasa & sewaktu dengan hasil serba cepat 5 detik dan memori histori tes.",
  },
  {
    id: "prod-2",
    name: "Metformin 500mg Release Control",
    category: "Obat Regulasional Gula Darah",
    price: "Rp 45.000",
    image: "/images/metformin.png",
    specs: "Metformin HCL 500mg • Controlled Release Tablet",
    description: "Obat utama pengontrol kadar gula darah puasa dan penurun resistensi insulin di bawah pengawasan medis.",
  },
  {
    id: "prod-3",
    name: "GlucoShield Cinnamon & Chromium Complex",
    category: "Suplemen Sensitivitas Insulin",
    price: "Rp 119.000",
    image: "/images/cinnamon_herbal.png",
    specs: "Ekstrak Kayu Manis • Chromium Picolinate • Alpha Lipoic Acid",
    description: "Suplemen herbal alami peningkat sensitivitas insulin dan pencegah lonjakan gula darah pasca makan.",
  },
  {
    id: "prod-4",
    name: "GlucoDerm Diabetic Ulcer Care Gel",
    category: "Gel Perawatan Luka Diabetes",
    price: "Rp 139.000",
    image: "/images/ulcer_gel.png",
    specs: "Hydrogel Medis • Centella Extract • Zinc Oxide",
    description: "Gel khusus penutup dan penyembuh luka basah diabetes (ulkus) agar kulit cepat beregenerasi dan tidak infeksi.",
  },
];

const SEED_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "dr. Hendra Wijaya, Sp.PD-KEMD",
    specialty: "Spesialis Endokrinologi & Diabetes Tipe 2",
    experience: "12+ Tahun Pengalaman",
    str: "STR & SIP Kemenkes RI",
    image: "/images/doctor_1.png",
    categoryIds: ["diabetes2", "insulin"],
  },
  {
    id: "doc-2",
    name: "dr. Siti Rahma, Sp.PD",
    specialty: "Spesialis Kontrol Gula Darah & Nutrisi",
    experience: "10+ Tahun Pengalaman",
    str: "STR & SIP Kemenkes RI",
    image: "/images/doctor_2.png",
    categoryIds: ["diabetes2", "gestational"],
  },
  {
    id: "doc-3",
    name: "dr. Andreas Pratama, Sp.PD-KEMD",
    specialty: "Spesialis Luka Diabetes (Ulkus)",
    experience: "14+ Tahun Pengalaman",
    str: "STR & SIP Kemenkes RI",
    image: "/images/doctor_3.png",
    categoryIds: ["ulkus", "diabetes2"],
  },
  {
    id: "doc-4",
    name: "dr. Maya Indriani, Sp.PD",
    specialty: "Spesialis Gestational Diabetes & HbA1c",
    experience: "9+ Tahun Pengalaman",
    str: "STR & SIP Kemenkes RI",
    image: "/images/doctor_4.png",
    categoryIds: ["gestational", "insulin"],
  },
];

const PRODUCTS_KEY = "glucocare_products";
const DOCTORS_KEY = "glucocare_doctors";

// ─── Provider ───────────────────────────────────────────

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedProducts = localStorage.getItem(PRODUCTS_KEY);
    const storedDoctors = localStorage.getItem(DOCTORS_KEY);

    setProducts(storedProducts ? JSON.parse(storedProducts) : SEED_PRODUCTS);
    setDoctors(storedDoctors ? JSON.parse(storedDoctors) : SEED_DOCTORS);
    setIsHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    }
  }, [products, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
    }
  }, [doctors, isHydrated]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const addProduct = useCallback((product: Omit<Product, "id">) => {
    setProducts((prev) => [...prev, { ...product, id: generateId() }]);
  }, []);

  const updateProduct = useCallback((id: string, product: Omit<Product, "id">) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...product, id } : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addDoctor = useCallback((doctor: Omit<Doctor, "id">) => {
    setDoctors((prev) => [...prev, { ...doctor, id: generateId() }]);
  }, []);

  const updateDoctor = useCallback((id: string, doctor: Omit<Doctor, "id">) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...doctor, id } : d)));
  }, []);

  const deleteDoctor = useCallback((id: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <DataStoreContext.Provider
      value={{
        products,
        doctors,
        addProduct,
        updateProduct,
        deleteProduct,
        addDoctor,
        updateDoctor,
        deleteDoctor,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error("useDataStore must be used within a DataStoreProvider");
  }
  return context;
}
