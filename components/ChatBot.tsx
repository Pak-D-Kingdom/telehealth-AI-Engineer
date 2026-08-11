"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MessageSquare, X, Send, User, Sparkles, ChevronDown, CheckCircle2, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  recommendations?: Array<{
    name: string;
    type: string;
    reason: string;
    image?: string;
  }>;
}

interface ChatBotProps {
  isOpen: boolean;
  onOpen: (query?: string) => void;
  onClose: () => void;
  initialQuery?: string;
}

export default function ChatBot({ isOpen, onOpen, onClose, initialQuery }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Halo! Gue DermAssistant MySkin. Lagi ada kendala apa nih sama kulit muka lo hari ini? Coba ceritain detail jerawat, flek hitam, atau breakout yang lagi bikin pusing.",
      timestamp: "Baru saja"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    let recs: Message["recommendations"] = undefined;

    if (textLower.includes("jerawat") || textLower.includes("acne") || textLower.includes("meradang")) {
      replyText = "Buat masalah jerawat meradang, kuncinya adalah menenangkan peradangan dulu dan mengontrol minyak tanpa merusak skin barrier. Jangan dipencet ya!";
      recs = [
        {
          name: "Lumina Salicylic Acid 2% Serum",
          type: "Targeted Serum",
          reason: "Membersihkan pori-pori tersumbat dan meredakan kemerahan jerawat aktif.",
          image: "/images/serum.png"
        },
        {
          name: "Gentle Centella Cleansing Gel",
          type: "Facial Wash",
          reason: "Membersihkan wajah tanpa sensasi kulit ketarik atau makin kering.",
          image: "/images/cream.png"
        }
      ];
    } else if (textLower.includes("dark spot") || textLower.includes("flek") || textLower.includes("bekas")) {
      replyText = "Noda hitam atau PIH bekas jerawat butuh waktu buat pudar, tapi kombinasi agen pencerah yang lembut bakal mempercepat prosesnya secara aman.";
      recs = [
        {
          name: "Lumina Niacinamide 5% + Alpha Arbutin",
          type: "Serum Pencerah",
          reason: "Menghambat penumpukan pigmen melanin dan menyamarkan noda hitam bekas jerawat.",
          image: "/images/serum.png"
        },
        {
          name: "Ultra Shield Sunscreen SPF 50 PA++++",
          type: "Sunscreen Mild",
          reason: "Mencegah noda hitam makin menghitam akibat paparan sinar UV harian.",
          image: "/images/cream.png"
        }
      ];
    } else if (textLower.includes("breakout") || textLower.includes("barrier") || textLower.includes("perih")) {
      replyText = "Kalau kulit terasa perih dan breakout parah, stop dulu semua bahan aktif keras (kayak AHA/BHA/Retinol). Fokus ke basic skincare buat memulihkan lapisan kulit.";
      recs = [
        {
          name: "Oak & Ash Ceramide Repair Cream",
          type: "Barrier Cream",
          reason: "Memperbaiki struktur lipid kulit yang terkelupas dan mengunci kelembapan.",
          image: "/images/cream.png"
        }
      ];
    } else {
      replyText = "Paham. Masalah kulit muka butuh perhatian khusus. Disarankan konsisten gunakan cleanser lembut, moisturizer pelembap, dan tutup dengan sunscreen setiap pagi.";
      recs = [
        {
          name: "Lumina Basic Skincare Kit",
          type: "Basic Routine",
          reason: "Rangkaian dasar untuk menjaga hidrasi dan keseimbangan kelembapan kulit.",
          image: "/images/serum.png"
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
          timestamp: "Baru saja",
          recommendations: recs
        }
      ]);
    }, 1000);
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: "Baru saja"
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    generateAIResponse(query);
  };

  const quickPrompts = [
    "Jerawat Meradang",
    "Flek & Bekas Hitam",
    "Skin Barrier Perih"
  ];

  return (
    <>
      {/* Floating Action Button (FAB) when Chat is Closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => onOpen()}
            className="group flex items-center gap-3 bg-[#132E21] hover:bg-[#1E4431] text-white px-5 py-3 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-[#285A41]/40 cursor-pointer"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20">
              <Image
                src="/images/derm_assistant_logo.svg"
                alt="DermAssistant Logo"
                fill
                className="object-cover"
              />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#E07A5F] rounded-full ring-2 ring-[#132E21]" />
            </div>
            <span className="font-bold text-sm tracking-wide">Konsul Derm</span>
          </button>
        </div>
      )}

      {/* Modern Slide-over / Modal Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[590px] max-h-[85vh] bg-[#FAF8F5] border border-[#E8E4DE] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          
          {/* Header */}
          <div className="bg-[#132E21] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shadow-sm shrink-0">
                <Image
                  src="/images/derm_assistant_logo.svg"
                  alt="DermAssistant Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                  MySkin DermAssistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-[#B0C4B8] font-medium">
                  Konsultasi Kulit Gen-Z
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Tutup Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAF8F5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1 shadow-sm border border-[#132E21]/20">
                    <Image
                      src="/images/derm_assistant_logo.svg"
                      alt="DermAssistant"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className={`max-w-[82%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#132E21] text-white rounded-tr-xs shadow-sm"
                        : "bg-white text-[#1A2421] border border-[#E8E4DE] rounded-tl-xs shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Recommendation Cards inside AI response */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#E8E4DE] space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E07A5F] block">
                          Rekomendasi Formulasi:
                        </span>
                        {msg.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="bg-[#FAF8F5] border border-[#E8E4DE] rounded-xl p-2.5 text-left flex gap-3 items-center hover:border-[#132E21]/30 transition-colors"
                          >
                            {rec.image && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-[#E8E4DE] bg-white">
                                <Image
                                  src={rec.image}
                                  alt={rec.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="font-bold text-[#132E21] text-xs truncate">
                                {rec.name}
                              </div>
                              <div className="text-[10px] text-[#E07A5F] font-semibold">
                                {rec.type}
                              </div>
                              <div className="text-[11px] text-[#4A5D53] line-clamp-2">
                                {rec.reason}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#8A9590] block mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[#E2EBE6] text-[#132E21] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#132E21] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                </div>
                <div className="bg-white border border-[#E8E4DE] px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-[#4A5D53] font-medium ml-1">Mencocokkan formulasi...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3.5 py-2.5 bg-white border-t border-[#E8E4DE] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="bg-[#FAF8F5] hover:bg-[#E2EBE6] border border-[#E8E4DE] text-[#132E21] px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3.5 bg-white border-t border-[#E8E4DE] flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis keluhan jerawat, flek, atau breakout..."
              className="flex-1 bg-[#FAF8F5] border border-[#E8E4DE] focus:border-[#132E21] focus:bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#1A2421] placeholder-[#8A9590] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-2xl bg-[#132E21] hover:bg-[#1E4431] disabled:bg-[#D5DCD8] text-white flex items-center justify-center transition-all shrink-0 shadow-sm active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
