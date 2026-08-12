export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  specs: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  slug?: string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
  specs?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface DoctorCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  registrationNumber: string | null;
  image: string | null;
  isActive: boolean;
  categories: DoctorCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface DoctorInput {
  slug?: string;
  name: string;
  specialty: string;
  experience: string;
  registrationNumber?: string | null;
  image?: string | null;
  isActive?: boolean;
  categoryIds: string[];
}
