"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Send, ShoppingCart, Stethoscope, Syringe, ChevronRight, Plus, Minus, Check } from "lucide-react";

interface ProductRec {
  id: string;
  name: string;
  unit: string;
  price: number;
  image: string;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  carousel?: ProductRec[];
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
  const [showCartDrawer, setShowCartDrawer] = useState(false);
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

    if (textLower.includes("jerawat") || textLower.includes("acne") || textLower.includes("meradang")) {
      replyText = "Buat jerawat meradang, kunci utamanya adalah meredakan inflamasi dan ngontrol minyak tanpa ngerusak skin barrier. Ini formulasi yang cocok buat kamu:";
      items = [
        {
          id: "p1",
          name: "Lumina Salicylic Acid 2% Serum",
          unit: "Serum 30ml",
          price: 129000,
          image: "/images/serum.png"
        },
        {
          id: "p2",
          name: "Gentle Centella Cleansing Gel",
          unit: "Facial Wash 100ml",
          price: 89000,
          image: "/images/cream.png"
        }
      ];
    } else if (textLower.includes("dark spot") || textLower.includes("flek") || textLower.includes("bekas")) {
      replyText = "Noda hitam bekas jerawat butuh agen pencerah lembut biar pudar bertahap. Ini kombinasi produk yang paling efektif:";
      items = [
        {
          id: "p3",
          name: "Lumina Niacinamide 5% + Arbutin",
          unit: "Serum Pencerah 30ml",
          price: 139000,
          image: "/images/serum.png"
        },
        {
          id: "p4",
          name: "Oak & Ash Botanical Cream",
          unit: "Moisturizer 50ml",
          price: 119000,
          image: "/images/cream.png"
        }
      ];
    } else if (textLower.includes("breakout") || textLower.includes("barrier") || textLower.includes("perih")) {
      replyText = "Kalau kulit muka terasa perih dan breakout parah, stop dulu bahan aktif keras. Fokus balikin kondisi skin barrier dengan produk penenang ini:";
      items = [
        {
          id: "p5",
          name: "Oak & Ash Ceramide Repair Cream",
          unit: "Barrier Cream 50ml",
          price: 149000,
          image: "/images/cream.png"
        }
      ];
    } else {
      replyText = "Paham. Masalah kulit muka butuh rutinitas dasar yang konsisten. Ini rekomendasi rangkaian dasar harian untukmu:";
      items = [
        {
          id: "p1",
          name: "Lumina Salicylic Acid 2% Serum",
          unit: "Serum 30ml",
          price: 129000,
          image: "/images/serum.png"
        },
        {
          id: "p5",
          name: "Oak & Ash Ceramide Repair Cream",
          unit: "Barrier Cream 50ml",
          price: 149000,
          image: "/images/cream.png"
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
          carousel: items
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
      {/* Floating Action Button (FAB HILDA Style) when Chat is Closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => onOpen()}
            className="group flex items-center gap-3 bg-white text-[#132E21] px-4 py-2.5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-[#E8E4DE] cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-[#132E21]/20">
              <Image
                src="/images/derm_assistant_logo.svg"
                alt="DermAssistant Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-left pr-1">
              <div className="font-extrabold text-sm text-[#132E21] leading-tight">DermAssistant</div>
              <div className="text-[10px] text-[#E07A5F] font-semibold">by MySkin Telehealth</div>
            </div>
          </button>
        </div>
      )}

      {/* Modern Slide-over Chat Window (HILDA Style) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[610px] max-h-[88vh] bg-white border border-[#E8E4DE] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          
          {/* HILDA Minimalist Header */}
          <div className="bg-white text-[#132E21] px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-gray-100 shadow-2xs">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Brand Header */}
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                <Image
                  src="/images/derm_assistant_logo.svg"
                  alt="DermAssistant Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-sm tracking-tight text-[#132E21]">
                DermAssistant <span className="text-[10px] font-normal text-[#E07A5F] ml-0.5">AI</span>
              </span>
            </div>

            <div className="w-8" /> {/* Spacer */}
          </div>

          {/* Chat Body & Welcome Screen */}
          <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-white">
            
            {/* If no messages yet, show HILDA Welcome Card Flow */}
            {messages.length === 0 && (
              <div className="text-center space-y-6 pt-4 px-2">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    Hai, aku <strong className="text-[#132E21]">DermAssistant</strong>, asisten AI kamu untuk rekomendasi skincare MySkin. Aku bisa memandumu memilih formulasi jerawat, flek, dan skin barrier.
                  </p>
                  <p className="text-sm text-gray-600 font-normal">
                    Mau mulai? Tanya saja atau pilih topik berikut.
                  </p>
                </div>

                {/* Topic Option Cards */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleSendMessage("Ada formulasi jerawat meradang yang aman?")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E07A5F] flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Ada formulasi jerawat meradang yang aman?
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Saya mau pudarkan flek hitam bekas jerawat.")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Saya mau pudarkan flek hitam bekas jerawat.
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Skin barrier saya perih dan breakout parah.")}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Syringe className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Skin barrier saya perih dan breakout parah.
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
                      ? "bg-[#132E21] text-white px-4 py-3 rounded-2xl rounded-tr-xs"
                      : "text-gray-800 font-normal pr-4"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Horizontal Product Recommendations Carousel (HILDA Style) */}
                {msg.carousel && msg.carousel.length > 0 && (
                  <div className="w-full pt-2">
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                      {msg.carousel.map((prod) => {
                        const inCartQty = cart[prod.id]?.qty || 0;
                        return (
                          <div
                            key={prod.id}
                            className="w-[200px] bg-white border border-gray-200 rounded-2xl p-3 shrink-0 flex flex-col justify-between shadow-2xs space-y-3"
                          >
                            <div className="space-y-2">
                              {/* Product Image Frame */}
                              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                <Image
                                  src={prod.image}
                                  alt={prod.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              {/* Title & Unit */}
                              <div>
                                <h4 className="font-bold text-xs text-gray-900 leading-snug line-clamp-2">
                                  {prod.name}
                                </h4>
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                  {prod.unit}
                                </span>
                              </div>

                              {/* Price */}
                              <div className="font-bold text-xs text-gray-900">
                                {formatRupiah(prod.price)}
                              </div>
                            </div>

                            {/* Add to Cart / Qty Control Button */}
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
                                  <span className="font-bold text-xs text-[#132E21]">
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
                <span className="text-xs text-gray-400 ml-1">DermAssistant mengetik...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Cart Banner when items selected (HILDA Image 3 Style) */}
          {totalCartItems > 0 && (
            <div className="bg-[#1A2421] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg border-t border-gray-800 animate-in slide-in-from-bottom-3">
              <div>
                <div className="text-xs font-bold">{totalCartItems} item terpilih</div>
                <div className="text-[11px] text-gray-300 font-medium">
                  Perkiraan harga <strong className="text-white">{formatRupiah(totalCartPrice)}</strong>
                </div>
              </div>
              <button
                onClick={() => handleSendMessage(`Gue mau pesan ${totalCartItems} item formulasi ini (Total: ${formatRupiah(totalCartPrice)}).`)}
                className="bg-[#E07A5F] hover:bg-[#C9664B] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                Konsul Rangkaian Ini
              </button>
            </div>
          )}

          {/* Input Footer (HILDA Style) */}
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
                placeholder="Tanyakan apa saja..."
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
