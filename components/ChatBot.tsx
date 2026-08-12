"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Send, ShoppingCart, Stethoscope, Syringe, ChevronRight, ArrowRight } from "lucide-react";

interface ProductRec {
  id: string;
  name: string;
  unit: string;
  price: number;
  image: string;
}

interface DoctorRef {
  name: string;
  specialty: string;
  experience: string;
  image: string;
  query: string;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  carousel?: ProductRec[];
  doctorReferral?: DoctorRef;
}

interface ChatBotProps {
  isOpen: boolean;
  onOpen: (query?: string) => void;
  onClose: () => void;
  initialQuery?: string;
}

export default function ChatBot({ isOpen, onOpen, onClose, initialQuery }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: { rec: ProductRec; qty: number } }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  const generateAIResponse = (userText: string) => {
    const textLower = userText.toLowerCase();
    let replyText = "";
    let items: ProductRec[] = [];
    let doctor: DoctorRef | undefined = undefined;

    if (textLower.includes("dokter") || textLower.includes("luka") || textLower.includes("parah") || textLower.includes("spesialis") || textLower.includes("200")) {
      replyText = "Berdasarkan gejala atau tingkat kadar gula darah yang kamu sampaikan, konsultasi AI ini sangat disarankan untuk dilanjutkan dengan Dokter Spesialis Penyakit Dalam (Sp.PD-KEMD) agar mendapatkan diagnosis & penanganan resep medis yang tepat.";
      doctor = {
        name: "dr. Hendra Wijaya, Sp.PD-KEMD",
        specialty: "Spesialis Endokrinologi & Diabetes Tipe 2",
        experience: "12+ Tahun Pengalaman • STR & SIP Kemenkes RI",
        image: "/images/doctor_1.png",
        query: "Gue mau konsul langsung lanjutan sama dr. Hendra, Sp.PD-KEMD mengenai gula darah."
      };
      items = [
        {
          id: "p1",
          name: "GlucoMeter Pro Digital Kit",
          unit: "Digital Kit + 50 Strip",
          price: 189000,
          image: "/images/glucometer.png"
        },
        {
          id: "p4",
          name: "GlucoDerm Diabetic Ulcer Care Gel",
          unit: "Gel Ulkus 50g",
          price: 139000,
          image: "/images/ulcer_gel.png"
        }
      ];
    } else if (textLower.includes("obat") || textLower.includes("metformin") || textLower.includes("gula darah")) {
      replyText = "Untuk regulasi kadar gula darah puasa, kombinasi obat regulasi metformin dan suplemen kayu manis alami terbukti membantu mengontrol resistensi insulin:";
      items = [
        {
          id: "p2",
          name: "Metformin 500mg Release Control",
          unit: "Obat Regulasional 30 Tab",
          price: 45000,
          image: "/images/metformin.png"
        },
        {
          id: "p3",
          name: "GlucoShield Herbal Cinnamon Complex",
          unit: "Suplemen Herbal 60 Kapsul",
          price: 119000,
          image: "/images/cinnamon_herbal.png"
        }
      ];
    } else if (textLower.includes("cek") || textLower.includes("alat") || textLower.includes("puasa")) {
      replyText = "Monitoring kadar gula darah puasa (normal <100 mg/dL) dan gula 2 jam pasca makan (<140 mg/dL) sangat disarankan secara rutin di rumah menggunakan kit digital ini:";
      items = [
        {
          id: "p1",
          name: "GlucoMeter Pro Digital Kit",
          unit: "Digital Kit + 50 Strip",
          price: 189000,
          image: "/images/glucometer.png"
        }
      ];
    } else {
      replyText = "Paham. Manajemen penyakit gula membutuhkan pemeriksaan rutin kadar gula darah, pengaturan makanan rendah indeks glikemik, dan obat regulasi yang tepat.";
      items = [
        {
          id: "p1",
          name: "GlucoMeter Pro Digital Kit",
          unit: "Digital Kit + 50 Strip",
          price: 189000,
          image: "/images/glucometer.png"
        },
        {
          id: "p2",
          name: "Metformin 500mg Release Control",
          unit: "Obat Regulasional 30 Tab",
          price: 45000,
          image: "/images/metformin.png"
        }
      ];
    }

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          carousel: items,
          doctorReferral: doctor
        }
      ]);
    }, 900);
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    generateAIResponse(query);
  };

  const updateCart = (product: ProductRec, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[product.id]?.qty || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return {
        ...prev,
        [product.id]: { rec: product, qty: newQty }
      };
    });
  };

  const totalCartItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const totalCartPrice = Object.values(cart).reduce((sum, item) => sum + (item.rec.price * item.qty), 0);

  const formatRupiah = (val: number) => {
    return "Rp" + val.toLocaleString("id-ID");
  };

  return (
    <>
      {/* Floating Action Button (FAB) when Chat is Closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => onOpen()}
            className="group flex items-center gap-3 bg-white text-[#0D5C46] px-4 py-2.5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-[#E8E4DE] cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-[#0D5C46]/20">
              <Image
                src="/images/glucocare_logo.svg"
                alt="GlucoAssistant Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-left pr-1">
              <div className="font-extrabold text-sm text-[#0D5C46] leading-tight">GlucoAssistant</div>
              <div className="text-[10px] text-[#E07A5F] font-semibold">by GlucoCare AI</div>
            </div>
          </button>
        </div>
      )}

      {/* Modern Slide-over Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[620px] max-h-[88vh] bg-white border border-[#E8E4DE] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          
          {/* Header */}
          <div className="bg-[#0D5C46] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Brand Header */}
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/30">
                <Image
                  src="/images/glucocare_logo.svg"
                  alt="GlucoAssistant Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                GlucoAssistant <span className="text-[10px] font-normal text-[#F4A261] ml-0.5">Sp.PD Referral</span>
              </span>
            </div>

            <div className="w-8" />
          </div>

          {/* Chat Body & Welcome Screen */}
          <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-white">
            
            {/* If no messages yet */}
            {messages.length === 0 && (
              <div className="text-center space-y-6 pt-4 px-2">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    Hai, aku <strong className="text-[#0D5C46]">GlucoAssistant</strong>, asisten AI untuk konsultasi kadar gula darah & penyakit gula. Aku bisa merekomendasikan obat, alat cek digital, serta menyambungkanmu ke **Dokter Spesialis Sp.PD**.
                  </p>
                  <p className="text-sm text-gray-600 font-normal">
                    Mau mulai? Tanya saja atau pilih topik berikut.
                  </p>
                </div>

                {/* Topic Option Cards */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleSendMessage("Berapa kadar gula darah puasa yang tergolong aman?")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D5C46] flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Berapa kadar gula darah puasa yang aman?
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Ada rekomendasi obat Metformin / suplemen gula darah?")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Ada rekomendasi obat Metformin / suplemen gula darah?
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Luka diabetes saya lambat sembuh, mau konsul ke Dokter Spesialis.")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#E07A5F] flex items-center justify-center shrink-0">
                      <Syringe className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Luka diabetes saya lambat sembuh, butuh Dokter Spesialis.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`space-y-3 ${
                  msg.sender === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
                }`}
              >
                {/* Text Message Bubble */}
                <div
                  className={`max-w-[88%] text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0D5C46] text-white px-4 py-3 rounded-2xl rounded-tr-xs"
                      : "text-gray-800 font-normal pr-4"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* DOCTOR REFERRAL CARD (Special Feature) */}
                {msg.doctorReferral && (
                  <div className="w-full bg-[#FAF8F5] border-2 border-[#0D5C46]/30 rounded-2xl p-4 space-y-3 shadow-xs my-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                      <Stethoscope className="w-4 h-4 text-[#0D5C46]" />
                      <span>Rujukan Dokter Spesialis Langsung:</span>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-gray-200">
                      <div className="relative w-12 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                        <Image
                          src={msg.doctorReferral.image}
                          alt={msg.doctorReferral.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#0D5C46] truncate">
                          {msg.doctorReferral.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-[#E07A5F] block">
                          {msg.doctorReferral.specialty}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {msg.doctorReferral.experience}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendMessage(msg.doctorReferral?.query)}
                      className="w-full bg-[#0D5C46] hover:bg-[#1A8B6B] text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Hubungkan Chat ke Dokter Ini</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E07A5F]" />
                    </button>
                  </div>
                )}

                {/* Horizontal Product Recommendations Carousel */}
                {msg.carousel && msg.carousel.length > 0 && (
                  <div className="w-full pt-1">
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                      {msg.carousel.map((prod) => {
                        const inCartQty = cart[prod.id]?.qty || 0;
                        return (
                          <div
                            key={prod.id}
                            className="w-[200px] bg-white border border-gray-200 rounded-2xl p-3 shrink-0 flex flex-col justify-between shadow-2xs space-y-3"
                          >
                            <div className="space-y-2">
                              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                <Image
                                  src={prod.image}
                                  alt={prod.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              <div>
                                <h4 className="font-bold text-xs text-gray-900 leading-snug line-clamp-2">
                                  {prod.name}
                                </h4>
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                  {prod.unit}
                                </span>
                              </div>

                              <div className="font-bold text-xs text-gray-900">
                                {formatRupiah(prod.price)}
                              </div>
                            </div>

                            <div>
                              {inCartQty === 0 ? (
                                <button
                                  onClick={() => updateCart(prod, 1)}
                                  className="w-full border border-[#E07A5F] hover:bg-[#E07A5F] text-[#E07A5F] hover:text-white font-bold text-xs py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                                >
                                  Tambah
                                </button>
                              ) : (
                                <div className="flex items-center justify-between border border-[#E07A5F] rounded-xl p-1 bg-[#FAF8F5]">
                                  <button
                                    onClick={() => updateCart(prod, -1)}
                                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-[#E07A5F] flex items-center justify-center font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold text-xs text-[#0D5C46]">
                                    {inCartQty}
                                  </span>
                                  <button
                                    onClick={() => updateCart(prod, 1)}
                                    className="w-6 h-6 rounded-lg bg-[#E07A5F] text-white flex items-center justify-center font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <span className="text-[9px] text-gray-400 block px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500 py-1">
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-gray-400 ml-1">GlucoAssistant menganalisis gejala...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Cart Banner */}
          {totalCartItems > 0 && (
            <div className="bg-[#0D5C46] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg border-t border-emerald-900 animate-in slide-in-from-bottom-3">
              <div>
                <div className="text-xs font-bold">{totalCartItems} item terpilih</div>
                <div className="text-[11px] text-gray-200 font-medium">
                  Perkiraan harga <strong className="text-white">{formatRupiah(totalCartPrice)}</strong>
                </div>
              </div>
              <button
                onClick={() => {
                  const items = Object.values(cart).map(item => ({
                    id: item.rec.id,
                    name: item.rec.name,
                    unit: item.rec.unit,
                    price: item.rec.price,
                    image: item.rec.image,
                    qty: item.qty
                  }));
                  localStorage.setItem("myskin_cart", JSON.stringify(items));
                  window.location.href = "/checkout";
                }}
                className="bg-[#E07A5F] hover:bg-[#C9664B] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>Checkout</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100 flex flex-col space-y-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan kadar gula, gejala, atau minta rujukan dokter..."
                className="flex-1 bg-[#F0F2F5] focus:bg-white border border-transparent focus:border-gray-300 rounded-full px-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-full bg-[#E07A5F] disabled:bg-gray-200 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[9px] text-gray-400 pl-4">
              {input.length}/500
            </div>
          </div>

        </div>
      )}
    </>
  );
}
