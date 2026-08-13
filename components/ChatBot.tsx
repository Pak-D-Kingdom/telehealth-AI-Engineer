"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Send, ShoppingCart, Stethoscope, Syringe, X } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-types";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  isEmergency?: boolean;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatHistory {
  sessionId: string;
  messages: StoredMessage[];
}

interface ChatReply {
  sessionId: string;
  reply: string;
  leadComplete: boolean;
  isEmergency: boolean;
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
  const [isSending, setIsSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledInitialQueryRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, chatError]);

  useEffect(() => {
    if (!isOpen || historyLoaded) return;

    let cancelled = false;
    const loadHistory = async () => {
      try {
        const response = await apiRequest<ApiResponse<ChatHistory>>("/api/chat");
        if (!cancelled) {
          setMessages(response.data.messages.map(toUiMessage));
        }
      } catch (error) {
        if (!cancelled && (!(error instanceof ApiError) || error.status !== 401)) {
          setChatError(errorMessage(error));
        }
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyLoaded, isOpen]);

  const sendMessage = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: formatTime(new Date()),
    };

    setMessages((previous) => [...previous, userMessage]);
    setChatError(null);
    setIsSending(true);

    try {
      const response = await apiRequest<ApiResponse<ChatReply>>("/api/chat", {
        method: "POST",
        body: { message: query },
      });
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: response.data.reply,
          timestamp: formatTime(new Date()),
          isEmergency: response.data.isEmergency,
        },
      ]);
    } catch (error) {
      setChatError(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      handledInitialQueryRef.current = null;
      return;
    }

    if (
      historyLoaded &&
      initialQuery &&
      handledInitialQueryRef.current !== initialQuery
    ) {
      handledInitialQueryRef.current = initialQuery;
      void sendMessage(initialQuery);
    }
  }, [historyLoaded, initialQuery, isOpen, sendMessage]);

  const handleSendMessage = (query = input) => {
    if (isSending || !historyLoaded || !query.trim()) return;
    if (query === input) setInput("");
    void sendMessage(query);
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => onOpen()}
            className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E8E4DE] bg-white px-4 py-2.5 text-[#0D5C46] shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#0D5C46]/20 shadow-sm">
              <Image src="/images/glucocare_logo.svg" alt="GlucoAssistant" fill className="object-cover" />
            </div>
            <div className="pr-1 text-left">
              <div className="text-sm font-extrabold leading-tight text-[#0D5C46]">GlucoAssistant</div>
              <div className="text-[10px] font-semibold text-[#E07A5F]">by GlucoCare AI</div>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[620px] max-h-[88vh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-[#E8E4DE] bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:w-[420px]">
          <header className="flex shrink-0 items-center justify-between bg-[#0D5C46] px-4 py-3.5 text-white shadow-sm">
            <button
              type="button"
              aria-label="Tutup percakapan"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/30">
                <Image src="/images/glucocare_logo.svg" alt="GlucoAssistant" fill className="object-cover" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                GlucoAssistant <span className="ml-0.5 text-[10px] font-normal text-[#F4A261]">AI Edukasi</span>
              </span>
            </div>
            <div className="w-8" />
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto bg-white p-4">
            {!historyLoaded && (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-400">
                Memuat percakapan...
              </div>
            )}

            {historyLoaded && messages.length === 0 && (
              <div className="space-y-6 px-2 pt-4 text-center">
                <div className="space-y-3">
                  <p className="text-sm font-medium leading-relaxed text-gray-700">
                    Hai, aku <strong className="text-[#0D5C46]">GlucoAssistant</strong>. Aku membantu edukasi umum seputar diabetes, mengenali tanda darurat, dan mengarahkanmu ke tenaga medis.
                  </p>
                  <p className="text-sm text-gray-600">Pilih topik atau tulis pertanyaanmu.</p>
                </div>
                <div className="space-y-3 pt-2">
                  <TopicButton
                    icon={<ShoppingCart className="h-4 w-4" />}
                    label="Apa arti hasil gula darah puasa saya?"
                    onClick={() => handleSendMessage("Apa arti hasil pemeriksaan gula darah puasa secara umum?")}
                    color="bg-teal-50 text-[#0D5C46]"
                    disabled={isSending}
                  />
                  <TopicButton
                    icon={<Stethoscope className="h-4 w-4" />}
                    label="Informasi umum tentang Metformin"
                    onClick={() => handleSendMessage("Jelaskan informasi umum tentang Metformin tanpa memberikan dosis atau resep.")}
                    color="bg-emerald-50 text-emerald-600"
                    disabled={isSending}
                  />
                  <TopicButton
                    icon={<Syringe className="h-4 w-4" />}
                    label="Luka diabetes lambat sembuh"
                    onClick={() => handleSendMessage("Luka diabetes saya lambat sembuh. Kapan saya perlu menemui dokter?")}
                    color="bg-orange-50 text-[#E07A5F]"
                    disabled={isSending}
                  />
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`space-y-2 ${message.sender === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}`}
              >
                <div
                  className={`max-w-[88%] text-sm leading-relaxed ${
                    message.sender === "user"
                      ? "rounded-2xl rounded-tr-xs bg-[#0D5C46] px-4 py-3 text-white"
                      : message.isEmergency
                        ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700"
                        : "pr-4 font-normal text-gray-800"
                  }`}
                >
                  {message.isEmergency && <AlertTriangle className="mb-2 h-5 w-5" />}
                  <p className="whitespace-pre-line">{message.text}</p>
                </div>
                <span className="px-1 text-[9px] text-gray-400">{message.timestamp}</span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 py-1 text-gray-500">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F] [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F] [animation-delay:0.4s]" />
                <span className="ml-1 text-xs text-gray-400">GlucoAssistant menyiapkan jawaban...</span>
              </div>
            )}

            {chatError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {chatError}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="shrink-0 space-y-1 border-t border-gray-100 bg-white p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                maxLength={2000}
                disabled={!historyLoaded || isSending}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Tanyakan gula darah, gejala, atau diabetes..."
                className="flex-1 rounded-full border border-transparent bg-[#F0F2F5] px-4 py-2.5 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white disabled:opacity-60 sm:text-sm"
              />
              <button
                type="submit"
                aria-label="Kirim pesan"
                disabled={!historyLoaded || !input.trim() || isSending}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#E07A5F] text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="flex items-center justify-between px-4 text-[9px] text-gray-400">
              <span>AI edukasi, bukan pengganti konsultasi dokter.</span>
              <span>{input.length}/2000</span>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}

function TopicButton({
  icon,
  label,
  onClick,
  color,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-3.5 text-left shadow-2xs transition-all hover:border-[#E07A5F] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">{label}</span>
    </button>
  );
}

function toUiMessage(message: StoredMessage): Message {
  return {
    id: message.id,
    sender: message.role === "assistant" ? "ai" : "user",
    text: message.content,
    timestamp: formatTime(new Date(message.createdAt)),
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const retryAfterSeconds = readRetryAfterSeconds(error.details);
    if (error.code === "AI_RATE_LIMITED" && retryAfterSeconds) {
      const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      return `${error.message} Coba lagi sekitar ${minutes} menit.`;
    }
    return error.message;
  }

  return "Chatbot tidak dapat dihubungi. Pastikan backend sedang berjalan.";
}

function readRetryAfterSeconds(details: unknown) {
  if (!details || typeof details !== "object" || !("retryAfterSeconds" in details)) {
    return undefined;
  }

  const value = details.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
