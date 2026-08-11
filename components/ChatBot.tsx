"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, RefreshCw, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  recommendations?: Array<{
    name: string;
    type: string;
    reason: string;
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
      text: "Halo. Gue DermAssistant MySkin. Lagi ada kendala apa nih sama kulit muka lo hari ini? Coba ceritain detail jerawat, flek hitam, atau breakout yang lagi bikin pusing.",
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
      replyText = "Buat masalah jerawat meradang, kuncinya adalah menenangan peradangan dulu dan ngontrol minyak tanpa ngerusak skin barrier. Jangan dipencet ya!";
      recs = [
        {
          name: "Lumina Salicylic Acid 2% Serum",
          type: "Serum Exfoliating Mild",
          reason: "Membersihkan pori-pori tersumbat dan meredakan kemerahan jerawat aktif."
        },
        {
          name: "Gentle Centella Cleansing Gel",
          type: "Facial Wash pH Balanced",
          reason: "Membersihkan wajah tanpa sensasi ditarik atau bikin kulit makin kering."
        }
      ];
    } else if (textLower.includes("dark spot") || textLower.includes("flek") || textLower.includes("bekas")) {
      replyText = "Noda hitam atau PIH bekas jerawat butuh waktu buat pudar, tapi kombinasi agen pencerah yang lembut bakal mempercepat prosesnya secara signifikan.";
      recs = [
        {
          name: "Lumina Niacinamide 5% + Alpha Arbutin",
          type: "Serum Pencerah Noda Hitam",
          reason: "Menghambat pembentukan pigmentasi melanin dan menyamarkan noda hitam bekas jerawat."
        },
        {
          name: "Ultra Shield Sunscreen SPF 50 PA++++",
          type: "Sunscreen Invisible Finish",
          reason: "Mencegah noda hitam makin menghitam akibat paparan sinar UV harian."
        }
      ];
    } else if (textLower.includes("breakout") || textLower.includes("barrier") || textLower.includes("perih")) {
      replyText = "Kalau kulit muka terasa perih dan breakout parah, stop dulu semua bahan aktif keras (kayak AHA/BHA/Retinol). Fokus ke basic skincare buat balikin kondisi lapisan kulit.";
      recs = [
        {
          name: "Oak & Ash Ceramide Repair Cream",
          type: "Moisturizer Skin Barrier",
          reason: "Memperbaiki struktur lipid kulit yang rusak dan mengunci hidrasi."
        }
      ];
    } else {
      replyText = "Paham. Masalah kulit muka emang butuh perhatian khusus. Untuk penanganan tepat, disarankan konsisten pakaikan cleanser lembut, moisturizer pelembap, dan selalu tutup dengan sunscreen tiap pagi.";
      recs = [
        {
          name: "Lumina Hydrating Care Kit",
          type: "Basic Skincare Set",
          reason: "Rangkaian dasar untuk menjaga hidrasi dan keseimbangan pH kulit."
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
    }, 1200);
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
    "Cara ngatasin jerawat meradang",
    "Rekomendasi bekas jerawat hitam",
    "Skin barrier lagi breakout perih"
  ];

  return (
    <>
      {/* Floating Action Button (FAB) when Chat is Closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => onOpen()}
            className="group flex items-center gap-3 bg-[#2D4A3E] hover:bg-[#233A31] text-white px-5 py-4 rounded-full shadow-2xl transition-all duration-300 animate-pulse-glow hover:scale-105 active:scale-95 border-2 border-white/40 cursor-pointer"
          >
            <div className="relative">
              <Bot className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#2D4A3E]" />
            </div>
            <span className="font-bold text-sm hidden sm:inline-block">Konsul Derm</span>
          </button>
        </div>
      )}

      {/* Slide-over / Modal Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] bg-white/95 backdrop-blur-xl border border-[#E6E1DA] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Chat Header */}
          <div className="bg-[#2D4A3E] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  MySkin DermAssistant
                  <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Online
                  </span>
                </h3>
                <p className="text-[11px] text-[#D4E2D4] font-medium">
                  Konsultasi Kulit Gen-Z
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAF8F5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-[#2D4A3E] text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[82%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#2D4A3E] text-white rounded-br-none shadow-sm"
                        : "bg-white text-[#1A1A1A] border border-[#E6E1DA] rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Recommendations Cards inside AI response */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#E6E1DA] space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D4A3E] block">
                          Formulasi Direkomendasikan:
                        </span>
                        {msg.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="bg-[#FAF8F5] border border-[#E0DCD5] rounded-xl p-2.5 text-left"
                          >
                            <div className="font-bold text-[#1A1A1A] text-xs">
                              {rec.name}
                            </div>
                            <div className="text-[10px] text-[#2D4A3E] font-semibold">
                              {rec.type}
                            </div>
                            <div className="text-[10px] text-[#5A5A5A] mt-1">
                              {rec.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#8A8A8A] block mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-[#E8EFE9] text-[#2D4A3E] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#2D4A3E] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-[#E6E1DA] p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#2D4A3E] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#2D4A3E] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#2D4A3E] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] text-[#5A5A5A] ml-1 font-medium">Memproses analisis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-[#E6E1DA] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="bg-[#FAF8F5] hover:bg-[#E8EFE9] border border-[#E0DCD5] text-[#2D4A3E] px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors"
              >
                + {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-[#E6E1DA] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik keluhan kulit lo di sini..."
              className="flex-1 bg-[#FAF8F5] border border-[#E0DCD5] focus:border-[#2D4A3E] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] placeholder-[#8A8A8A] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl bg-[#2D4A3E] hover:bg-[#233A31] disabled:bg-[#CCCCCC] text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
