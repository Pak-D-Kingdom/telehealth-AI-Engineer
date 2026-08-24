"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { DataStoreProvider } from "@/lib/data-store";
import {
  LayoutDashboard,
  Package,
  Stethoscope,
  LogOut,
  MessageSquareText,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/produk", label: "Produk & Alat", icon: Package },
  { href: "/admin/dokter", label: "Dokter Spesialis", icon: Stethoscope },
  { href: "/admin/booking", label: "Jadwal & Booking", icon: CalendarDays },
  { href: "/admin/chat", label: "Percakapan & Data Pasien", icon: MessageSquareText },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  // Login page renders without sidebar/auth guard
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-6 h-6 border-2 border-[#0D5C46]/20 border-t-[#0D5C46] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5]">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0D5C46] text-white shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-sm font-extrabold tracking-tight">Pengelola GlucoCare</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white w-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-[#0D5C46] text-white z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <span className="text-sm font-extrabold tracking-tight">Pengelola GlucoCare</span>
              <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white w-full transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 flex items-center gap-4 px-6 bg-white border-b border-[#EAE4DC] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#4A5D53] hover:text-[#0D5C46] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[#0D5C46] lg:hidden">Pengelola GlucoCare</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataStoreProvider>
        <AdminShell>{children}</AdminShell>
      </DataStoreProvider>
    </AuthProvider>
  );
}
