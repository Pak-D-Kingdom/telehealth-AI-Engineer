"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Banknote,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import {
  CART_CHANGE_EVENT,
  CART_KEY,
  getCartSnapshot,
  getServerCartSnapshot,
  parseCart,
  saveCart,
  subscribeToCart,
} from "@/lib/cart";

export default function CheckoutPage() {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const items = useMemo(() => parseCart(cartSnapshot), [cartSnapshot]);
  const [step, setStep] = useState<"checkout" | "success" | "failed">("checkout");
  const [isProcessing, setIsProcessing] = useState(false);

  // User Shipping Form State
  const [formData, setFormData] = useState({
    fullName: "Budi Santoso",
    phone: "081234567890",
    city: "Jakarta Selatan",
    address: "Jl. Sudirman No. 45, Senayan, Kec. Kebayoran Baru",
    postalCode: "12190",
    notes: "Titipkan di satpam jika rumah kosong."
  });

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "va" | "cod">("qris");
  const [selectedBank, setSelectedBank] = useState<string>("BCA");

  const updateQty = (id: string, delta: number) => {
    saveCart(
      items
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingFee = subtotal > 200000 || items.length === 0 ? 0 : 12000;
  const grandTotal = subtotal + shippingFee;

  const formatRupiah = (num: number) => {
    return "Rp" + num.toLocaleString("id-ID");
  };

  const handleProcessPayment = (simulateSuccess: boolean = true) => {
    if (!formData.fullName || !formData.phone || !formData.address) {
      alert("Lengkapi data nama, nomor telepon, dan alamat pengiriman terlebih dahulu.");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      if (simulateSuccess) {
        localStorage.removeItem(CART_KEY);
        window.dispatchEvent(new Event(CART_CHANGE_EVENT));
        setStep("success");
      } else {
        setStep("failed");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#132E21] font-sans antialiased selection:bg-[#E07A5F] selection:text-white">
      
      {/* GlucoCare checkout header */}
      <header className="bg-[#132E21] text-white border-b border-[#1E4431]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#B0C4B8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#E07A5F]" />
            <span>Kembali ke Toko</span>
          </Link>

          {/* GlucoCare horizontal logo */}
          <div className="relative w-36 h-10 sm:w-44 sm:h-12">
            <Image
              src="/images/logo_horizontal.png"
              alt="GlucoCare Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#B0C4B8] font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pembayaran Aman</span>
          </div>
        </div>
      </header>

      {/* Checkout Content */}
      {step === "checkout" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Page Title */}
          <div className="mb-10 pb-6 border-b border-[#EAE4DC] flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-widest block mb-1">
                Langkah Akhir
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#132E21] tracking-tight">
                Pengiriman & Pembayaran
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#4A5D53]">
              Lengkapi informasi tujuan pengiriman produk pilihanmu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Forms */}
            <div className="lg:col-span-7 space-y-12">
              
              {/* Section 01: Pengiriman */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-white bg-[#132E21] w-7 h-7 rounded-full flex items-center justify-center">
                    01
                  </span>
                  <h2 className="text-lg font-bold text-[#132E21]">Tujuan Pengiriman Paket</h2>
                </div>

                <div className="space-y-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E4DE] shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Nama penerima"
                        className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                        Nomor WhatsApp / HP
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0812xxxxxxx"
                        className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Kota tujuan"
                        className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                        Kode Pos
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="12xxx"
                        className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                      Alamat Lengkap (Jalan, No. Rumah, RT/RW)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Alamat pengiriman detail..."
                      className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#132E21] uppercase tracking-wider mb-2">
                      Catatan Kurir (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Titip di pos satpam atau tetangga"
                      className="w-full bg-[#FAF8F5] border-b-2 border-[#E8E4DE] focus:border-[#132E21] px-3 py-2.5 text-sm text-[#132E21] font-semibold outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 02: Metode Pembayaran */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-white bg-[#132E21] w-7 h-7 rounded-full flex items-center justify-center">
                    02
                  </span>
                  <h2 className="text-lg font-bold text-[#132E21]">Metode Pembayaran</h2>
                </div>

                <div className="space-y-4">
                  
                  {/* QRIS */}
                  <label
                    onClick={() => setPaymentMethod("qris")}
                    className={`flex items-start justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === "qris"
                        ? "border-[#132E21] bg-white ring-2 ring-[#132E21] shadow-sm"
                        : "border-[#E8E4DE] bg-white hover:border-[#132E21]/40"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === "qris"}
                        onChange={() => setPaymentMethod("qris")}
                        className="accent-[#132E21] w-4 h-4 mt-1"
                      />
                      <div className="space-y-3">
                        <div>
                          <span className="font-extrabold text-sm text-[#132E21] block">
                            QRIS Instant (Semua M-Banking & E-Wallet)
                          </span>
                          <span className="text-xs text-[#4A5D53] font-medium">
                            Scan langsung tanpa perlu upload bukti transfer. Bebas biaya admin.
                          </span>
                        </div>

                        {/* E-Wallet & QRIS Logo Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="relative w-16 h-7 rounded-md overflow-hidden border border-red-200 bg-white shadow-2xs">
                            <Image src="/images/payments/qris.svg" alt="QRIS" fill className="object-contain p-0.5" />
                          </div>
                          <div className="relative w-14 h-6 rounded-md overflow-hidden border border-gray-200 bg-white shadow-2xs">
                            <Image src="/images/payments/gopay.svg" alt="GoPay" fill className="object-contain p-0.5" />
                          </div>
                          <div className="relative w-14 h-6 rounded-md overflow-hidden border border-gray-200 bg-white shadow-2xs">
                            <Image src="/images/payments/shopeepay.svg" alt="ShopeePay" fill className="object-contain p-0.5" />
                          </div>
                          <div className="relative w-12 h-6 rounded-md overflow-hidden border border-gray-200 bg-white shadow-2xs">
                            <Image src="/images/payments/ovo.svg" alt="OVO" fill className="object-contain p-0.5" />
                          </div>
                          <div className="relative w-12 h-6 rounded-md overflow-hidden border border-gray-200 bg-white shadow-2xs">
                            <Image src="/images/payments/dana.svg" alt="DANA" fill className="object-contain p-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Virtual Account */}
                  <label
                    onClick={() => setPaymentMethod("va")}
                    className={`flex items-start justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === "va"
                        ? "border-[#132E21] bg-white ring-2 ring-[#132E21] shadow-sm"
                        : "border-[#E8E4DE] bg-white hover:border-[#132E21]/40"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === "va"}
                        onChange={() => setPaymentMethod("va")}
                        className="accent-[#132E21] w-4 h-4 mt-1"
                      />
                      <div className="space-y-3">
                        <div>
                          <span className="font-extrabold text-sm text-[#132E21] block">
                            Virtual Account Bank
                          </span>
                          <span className="text-xs text-[#4A5D53] font-medium">
                            Verifikasi otomatis 24 jam via m-banking / ATM.
                          </span>
                        </div>

                        {/* Bank Logos */}
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {[
                            { name: "BCA", logo: "/images/payments/bca.svg" },
                            { name: "Mandiri", logo: "/images/payments/mandiri.svg" },
                            { name: "BRI", logo: "/images/payments/bri.svg" },
                            { name: "BNI", logo: "/images/payments/bni.svg" }
                          ].map((b) => {
                            const isSelected = paymentMethod === "va" && selectedBank === b.name;
                            return (
                              <button
                                key={b.name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentMethod("va");
                                  setSelectedBank(b.name);
                                }}
                                className={`relative w-16 h-8 rounded-lg border transition-all flex items-center justify-center p-1 ${
                                  isSelected
                                    ? "border-[#132E21] ring-2 ring-[#132E21] bg-white scale-105 shadow-sm"
                                    : "border-gray-200 bg-[#FAF8F5] opacity-80 hover:opacity-100"
                                }`}
                              >
                                <Image src={b.logo} alt={b.name} fill className="object-contain p-1" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* COD */}
                  <label
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === "cod"
                        ? "border-[#132E21] bg-white ring-2 ring-[#132E21] shadow-sm"
                        : "border-[#E8E4DE] bg-white hover:border-[#132E21]/40"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="accent-[#132E21] w-4 h-4"
                      />
                      <div>
                        <span className="font-extrabold text-sm text-[#132E21] block">
                          COD (Bayar di Tempat Saat Paket Tiba)
                        </span>
                        <span className="text-xs text-[#4A5D53] font-medium">
                          Bayar tunai secara aman langsung ke kurir ekspres saat paket diterima.
                        </span>
                      </div>
                    </div>
                    <Banknote className="w-6 h-6 text-[#285A41] shrink-0 hidden sm:block" />
                  </label>

                </div>
              </div>

            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DE] shadow-sm space-y-6 sticky top-8">
                
                {/* Header logo in summary */}
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-4">
                  <h3 className="text-base font-extrabold text-[#132E21]">Rincian Pesanan</h3>
                  <div className="relative w-24 h-7">
                    <Image
                      src="/images/logo_horizontal.png"
                      alt="GlucoCare"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center border-b border-[#F0ECE6] pb-4 last:border-b-0">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#E8E4DE] shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#132E21] truncate">
                          {item.name}
                        </h4>
                        <span className="text-[11px] text-[#E07A5F] font-semibold block">
                          {item.category || "Produk Medis"}
                        </span>
                        <span className="text-xs font-extrabold text-[#132E21] mt-1 block">
                          {formatRupiah(item.price)}
                        </span>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E8E4DE] rounded-xl p-1">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-5 h-5 rounded-lg bg-white border border-[#E8E4DE] text-xs font-bold text-[#132E21] flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold px-1 text-[#132E21]">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-5 h-5 rounded-lg bg-[#132E21] text-white text-xs font-bold flex items-center justify-center hover:bg-[#1E4431]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation */}
                <div className="space-y-3 pt-4 border-t border-[#F0ECE6] text-xs text-[#4A5D53]">
                  <div className="flex justify-between">
                    <span>Subtotal Produk</span>
                    <span className="font-bold text-[#132E21]">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya Pengiriman Ekspres</span>
                    <span className="font-bold text-emerald-600">
                      {shippingFee === 0 ? "GRATIS PROMO" : formatRupiah(shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-[#132E21] pt-3 border-t border-[#F0ECE6]">
                    <span>Total Pembayaran</span>
                    <span className="text-lg text-[#E07A5F]">{formatRupiah(grandTotal)}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleProcessPayment(true)}
                    disabled={isProcessing || items.length === 0}
                    className="w-full bg-[#132E21] hover:bg-[#1E4431] disabled:bg-gray-300 text-white font-extrabold text-sm py-4 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <span>Memproses Pembayaran...</span>
                    ) : (
                      <>
                        <span>Bayar Sekarang — {formatRupiah(grandTotal)}</span>
                        <ChevronRight className="w-4 h-4 text-[#E07A5F]" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleProcessPayment(false)}
                    disabled={isProcessing || items.length === 0}
                    className="w-full text-center text-xs text-rose-600 hover:underline pt-1 cursor-pointer font-medium"
                  >
                    Simulasi Sesi Gagal Pembayaran →
                  </button>
                </div>

              </div>
            </div>

          </div>

        </main>
      )}

      {/* Success View */}
      {step === "success" && (
        <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
          
          <div className="relative w-44 h-12 mx-auto">
            <Image
              src="/images/logo_horizontal.png"
              alt="GlucoCare Logo"
              fill
              className="object-contain"
            />
          </div>

          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-[#132E21]">
              Pembayaran Berhasil!
            </h1>
            <p className="text-sm text-[#4A5D53] max-w-md mx-auto">
              Pesanan <strong className="text-[#132E21]">#GLC-894210</strong> telah dikonfirmasi. Tim farmasi kami sedang mengemas pesananmu.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#E8E4DE] text-left space-y-4 max-w-lg mx-auto shadow-2xs">
            <div className="flex justify-between items-center border-b border-[#F0ECE6] pb-3 text-xs">
              <span className="text-gray-500">Penerima Paket</span>
              <span className="font-bold text-[#132E21]">{formData.fullName} ({formData.phone})</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#F0ECE6] pb-3 text-xs">
              <span className="text-gray-500">Estimasi Tiba</span>
              <span className="font-bold text-emerald-600">1 - 2 Hari Kerja</span>
            </div>
            <div className="flex justify-between items-center text-sm font-extrabold text-[#132E21] pt-1">
              <span>Total Dibayar</span>
              <span className="text-[#E07A5F]">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto bg-[#132E21] text-white font-bold text-xs px-6 py-3.5 rounded-2xl hover:bg-[#1E4431] transition-all"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </main>
      )}

      {/* Failed View */}
      {step === "failed" && (
        <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
          
          <div className="relative w-44 h-12 mx-auto">
            <Image
              src="/images/logo_horizontal.png"
              alt="GlucoCare Logo"
              fill
              className="object-contain"
            />
          </div>

          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-[#132E21]">
              Pembayaran Belum Berhasil
            </h1>
            <p className="text-sm text-[#4A5D53] max-w-md mx-auto">
              Waktu sesi pembayaran QRIS atau otorisasi m-banking kamu telah kadaluarsa. Saldo kamu belum terpotong.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setStep("checkout")}
              className="w-full sm:w-auto bg-[#132E21] text-white font-bold text-xs px-6 py-3.5 rounded-2xl hover:bg-[#1E4431] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-[#E07A5F]" />
              <span>Coba Pembayaran Ulang</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto bg-white border border-[#E8E4DE] text-[#132E21] font-bold text-xs px-6 py-3.5 rounded-2xl hover:bg-[#FAF8F5] transition-all"
            >
              Batal
            </Link>
          </div>
        </main>
      )}

    </div>
  );
}
