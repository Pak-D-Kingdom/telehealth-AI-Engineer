"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.replace("/admin");
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : "Tidak dapat memproses login saat ini.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D5C46] px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* White Logo directly on Dark Green background */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="relative w-48 h-12">
            <Image
              src="/images/logo_horizontal.png"
              alt="GlucoCare Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-xs font-semibold text-[#88D39E]">
            Admin Dashboard
          </p>
        </div>

        {/* Clean Minimalist White Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-8 shadow-xl space-y-5"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-[#4A5D53] uppercase tracking-wider block">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@glucocare.id"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#E2D9CC] bg-[#FAF8F5] text-sm text-[#1A2421] placeholder:text-[#A0ABA4] focus:outline-none focus:border-[#0D5C46] transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-[#4A5D53] uppercase tracking-wider block">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#E2D9CC] bg-[#FAF8F5] text-sm text-[#1A2421] placeholder:text-[#A0ABA4] focus:outline-none focus:border-[#0D5C46] transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E07A5F] hover:bg-[#C9664B] disabled:opacity-60 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-[#88D39E]/80">
          Gunakan akun admin yang dikonfigurasi pada backend.
        </p>
      </div>
    </div>
  );
}
