"use client";

import React, { createContext, useCallback, useContext } from "react";
import useSWR from "swr";
import { apiFetcher, apiRequest, type ApiError } from "@/lib/api-client";
import type {
  ApiResponse,
  Doctor,
  DoctorCategory,
  DoctorInput,
  Product,
  ProductInput,
} from "@/lib/api-types";
import { useAuth } from "@/lib/auth-context";

export type { Doctor, DoctorCategory, DoctorInput, Product, ProductInput };

interface DataStoreContextType {
  products: Product[];
  doctors: Doctor[];
  categories: DoctorCategory[];
  isLoading: boolean;
  error: string | null;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, product: Partial<ProductInput>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addDoctor: (doctor: DoctorInput) => Promise<void>;
  updateDoctor: (id: string, doctor: Partial<DoctorInput>) => Promise<void>;
  deleteDoctor: (id: string) => Promise<void>;
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const {
    data: productResponse,
    error: productError,
    isLoading: productsLoading,
    mutate: mutateProducts,
  } = useSWR<ApiResponse<Product[]>, ApiError>(
    isAuthenticated ? "/api/admin/products?limit=100" : null,
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const {
    data: doctorResponse,
    error: doctorError,
    isLoading: doctorsLoading,
    mutate: mutateDoctors,
  } = useSWR<ApiResponse<Doctor[]>, ApiError>(
    isAuthenticated ? "/api/admin/doctors?limit=100" : null,
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const {
    data: categoryResponse,
    error: categoryError,
    isLoading: categoriesLoading,
  } = useSWR<ApiResponse<DoctorCategory[]>, ApiError>(
    isAuthenticated ? "/api/doctor-categories" : null,
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const addProduct = useCallback(
    async (product: ProductInput) => {
      await apiRequest<ApiResponse<Product>>("/api/products", {
        method: "POST",
        body: product,
      });
      await mutateProducts();
    },
    [mutateProducts],
  );

  const updateProduct = useCallback(
    async (id: string, product: Partial<ProductInput>) => {
      await apiRequest<ApiResponse<Product>>(`/api/products/${id}`, {
        method: "PATCH",
        body: product,
      });
      await mutateProducts();
    },
    [mutateProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await apiRequest<void>(`/api/products/${id}`, { method: "DELETE" });
      await mutateProducts();
    },
    [mutateProducts],
  );

  const addDoctor = useCallback(
    async (doctor: DoctorInput) => {
      await apiRequest<ApiResponse<Doctor>>("/api/doctors", {
        method: "POST",
        body: doctor,
      });
      await mutateDoctors();
    },
    [mutateDoctors],
  );

  const updateDoctor = useCallback(
    async (id: string, doctor: Partial<DoctorInput>) => {
      await apiRequest<ApiResponse<Doctor>>(`/api/doctors/${id}`, {
        method: "PATCH",
        body: doctor,
      });
      await mutateDoctors();
    },
    [mutateDoctors],
  );

  const deleteDoctor = useCallback(
    async (id: string) => {
      await apiRequest<void>(`/api/doctors/${id}`, { method: "DELETE" });
      await mutateDoctors();
    },
    [mutateDoctors],
  );

  const requestError = productError ?? doctorError ?? categoryError;

  return (
    <DataStoreContext.Provider
      value={{
        products: productResponse?.data ?? [],
        doctors: doctorResponse?.data ?? [],
        categories: categoryResponse?.data ?? [],
        isLoading:
          isAuthenticated && (productsLoading || doctorsLoading || categoriesLoading),
        error: requestError?.message ?? null,
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
