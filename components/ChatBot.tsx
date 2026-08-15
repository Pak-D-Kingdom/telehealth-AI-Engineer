"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  ChevronRight,
  ImageIcon,
  MessageSquarePlus,
  Paperclip,
  RefreshCw,
  Send,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";
import { ApiError, apiRequest, streamApiRequest } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-types";

interface ChatSource {
  title: string;
  source: string;
}

export interface DoctorRef {
  name: string;
  specialty: string;
  experience: string;
  image?: string;
  query: string;
}

export interface ProductRef {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
  specs?: string | null;
  description?: string | null;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  image?: string;
  timestamp: string;
  sources?: ChatSource[];
  suggestions?: string[];
  doctorReferral?: DoctorRef;
  products?: ProductRef[];
  isEmergency?: boolean;
  sbarComplete?: boolean;
  isStreaming?: boolean;
  failed?: boolean;
  persisted?: boolean;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[];
  createdAt: string;
}

interface ChatHistory {
  sessionId: string;
  messages: StoredMessage[];
}

type ProviderState = "READY" | "RATE_LIMITED" | "UNAVAILABLE" | "NOT_CONFIGURED";

interface ProviderStatus {
  provider: "groq";
  model: string;
  status: ProviderState;
  retryAfterSeconds?: number;
}

interface ProviderStatusView extends ProviderStatus {
  retryAt?: number;
}

interface StreamMeta {
  sessionId: string;
  sources: ChatSource[];
  isEmergency: boolean;
}

interface StreamToken {
  token: string;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledInitialQueryRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshProviderStatus = useCallback(async () => {
    try {
      const response = await apiRequest<ApiResponse<ProviderStatus>>("/api/chat/status");
      setProviderStatus({
        ...response.data,
        ...(response.data.retryAfterSeconds
          ? { retryAt: Date.now() + response.data.retryAfterSeconds * 1_000 }
          : {}),
      });
    } catch {
      setProviderStatus({
        provider: "groq",
        model: "",
        status: "UNAVAILABLE",
        retryAfterSeconds: 15,
        retryAt: Date.now() + 15_000,
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, chatError]);

  useEffect(() => {
    if (!isOpen) return;

    const initialRefresh = window.setTimeout(() => void refreshProviderStatus(), 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    const refresh = window.setInterval(() => void refreshProviderStatus(), 15_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, [isOpen, refreshProviderStatus]);

  useEffect(() => {
    if (!isOpen || historyLoaded) return;

    let cancelled = false;
    const loadHistory = async () => {
      try {
        const response = await apiRequest<ApiResponse<ChatHistory>>("/api/chat");
        if (!cancelled) {
          setMessages(response.data.messages.map((message, index, all) => ({
            ...toUiMessage(message),
            failed: index === all.length - 1 && message.role === "user",
          })));
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

  const streamResponse = useCallback(async (
    path: "/api/chat/stream" | "/api/chat/retry/stream",
    body: unknown,
    userMessageId: string,
  ) => {
    const assistantMessageId = crypto.randomUUID();
    let completed = false;
    let tokenBuffer = "";
    let animationFrame: number | undefined;

    const flushTokens = () => {
      if (!tokenBuffer) return;
      const tokens = tokenBuffer;
      tokenBuffer = "";
      setMessages((previous) => previous.map((message) =>
        message.id === assistantMessageId
          ? { ...message, text: message.text + tokens }
          : message,
      ));
    };

    setMessages((previous) => [
      ...previous,
      {
        id: assistantMessageId,
        sender: "ai",
        text: "",
        timestamp: formatTime(new Date()),
        sources: [],
        isStreaming: true,
      },
    ]);
    setChatError(null);
    setIsSending(true);

    try {
      await streamApiRequest(path, { method: "POST", body }, ({ event, data }) => {
        if (event === "meta" && isStreamMeta(data)) {
          setMessages((previous) => updateMessage(previous, assistantMessageId, {
            sources: data.sources,
            isEmergency: data.isEmergency,
          }).map((message) => message.id === userMessageId
            ? { ...message, persisted: true }
            : message));
        }

        if (event === "token" && isStreamToken(data)) {
          tokenBuffer += data.token;
          if (animationFrame === undefined) {
            animationFrame = window.requestAnimationFrame(() => {
              animationFrame = undefined;
              flushTokens();
            });
          }
        }

        if (event === "done") {
          if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
          animationFrame = undefined;
          flushTokens();
          completed = true;

          const doneData = data as {
            sessionId?: string;
            leadComplete?: boolean;
            isEmergency?: boolean;
            sbarComplete?: boolean;
            sources?: ChatSource[];
            suggestions?: string[];
            doctorReferral?: DoctorRef;
            products?: ProductRef[];
          };

          setMessages((previous) => updateMessage(previous, assistantMessageId, {
            isStreaming: false,
            timestamp: formatTime(new Date()),
            sbarComplete: doneData.sbarComplete,
            suggestions: Array.isArray(doneData.suggestions) ? doneData.suggestions : undefined,
            doctorReferral: doneData.doctorReferral,
            products: Array.isArray(doneData.products) ? doneData.products : undefined,
          }));
        }
      });

      if (!completed) {
        throw new ApiError(502, "STREAM_INTERRUPTED", "Koneksi jawaban terputus sebelum selesai.");
      }
    } catch (error) {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      setMessages((previous) => previous
        .filter((message) => message.id !== assistantMessageId)
        .map((message) => message.id === userMessageId ? { ...message, failed: true } : message));
      setChatError(errorMessage(error));
      updateProviderFromError(error, setProviderStatus);
    } finally {
      setIsSending(false);
      void refreshProviderStatus();
    }
  }, [refreshProviderStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendMessage = useCallback(async (rawQuery: string, imageBase64?: string | null) => {
    const query = rawQuery.trim();
    if (!query && !imageBase64) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query || (imageBase64 ? "Tolong analisis gambar ini" : ""),
      image: imageBase64 || undefined,
      timestamp: formatTime(new Date()),
      persisted: false,
    };

    setMessages((previous) => [...previous, userMessage]);
    await streamResponse(
      "/api/chat/stream",
      { message: query, image: imageBase64 || undefined },
      userMessage.id,
    );
  }, [streamResponse]);

  useEffect(() => {
    if (!isOpen) {
      handledInitialQueryRef.current = null;
      return;
    }

    if (
      historyLoaded &&
      initialQuery &&
      !isSending &&
      !messages.some((message) => message.failed) &&
      !isProviderBlocked(providerStatus, Date.now()) &&
      handledInitialQueryRef.current !== initialQuery
    ) {
      handledInitialQueryRef.current = initialQuery;
      void sendMessage(initialQuery);
    }
  }, [historyLoaded, initialQuery, isOpen, isSending, messages, providerStatus, sendMessage]);

  const failedMessage = useMemo(
    () => messages.findLast((message) => message.sender === "user" && message.failed),
    [messages],
  );
  const providerBlocked = isProviderBlocked(providerStatus, now);

  const handleSendMessage = (query = input) => {
    if (isSending || !historyLoaded || failedMessage || providerBlocked || (!query.trim() && !selectedImage)) return;
    const imgToSend = selectedImage;
    if (query === input) {
      setInput("");
      setSelectedImage(null);
    }
    void sendMessage(query, imgToSend);
  };

  const handleRetry = () => {
    if (!failedMessage || isSending || providerBlocked) return;
    setMessages((previous) => updateMessage(previous, failedMessage.id, { failed: false }));
    void streamResponse(
      failedMessage.persisted ? "/api/chat/retry/stream" : "/api/chat/stream",
      failedMessage.persisted ? {} : { message: failedMessage.text },
      failedMessage.id,
    );
  };

  const handleNewConversation = async () => {
    if (isSending || isResetting) return;
    if (messages.length > 0 && !window.confirm("Mulai percakapan baru? Riwayat saat ini akan ditutup.")) {
      return;
    }

    setIsResetting(true);
    setChatError(null);
    try {
      await apiRequest<void>("/api/chat", { method: "DELETE" });
      setMessages([]);
      setInput("");
      setHistoryLoaded(true);
      await refreshProviderStatus();
    } catch (error) {
      setChatError(errorMessage(error));
    } finally {
      setIsResetting(false);
    }
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
          <header className="shrink-0 bg-[#0D5C46] px-4 py-3 text-white shadow-sm">
            <div className="flex items-center justify-between">
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
              <button
                type="button"
                aria-label="Mulai percakapan baru"
                title="Mulai percakapan baru"
                disabled={isSending || isResetting}
                onClick={() => void handleNewConversation()}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
            <ProviderBadge status={providerStatus} now={now} />
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
                    disabled={isSending || providerBlocked}
                  />
                  <TopicButton
                    icon={<Stethoscope className="h-4 w-4" />}
                    label="Informasi umum tentang Metformin"
                    onClick={() => handleSendMessage("Jelaskan informasi umum tentang Metformin tanpa memberikan dosis atau resep.")}
                    color="bg-emerald-50 text-emerald-600"
                    disabled={isSending || providerBlocked}
                  />
                  <TopicButton
                    icon={<Syringe className="h-4 w-4" />}
                    label="Luka diabetes lambat sembuh"
                    onClick={() => handleSendMessage("Luka diabetes saya lambat sembuh. Kapan saya perlu menemui dokter?")}
                    color="bg-orange-50 text-[#E07A5F]"
                    disabled={isSending || providerBlocked}
                  />
                </div>
              </div>
            )}

            <div aria-live="polite" className="contents">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`space-y-2 ${message.sender === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}`}
                >
                  <div
                    className={`max-w-[88%] text-sm leading-relaxed ${
                      message.sender === "user"
                        ? `rounded-2xl rounded-tr-xs bg-[#0D5C46] px-4 py-3 text-white ${message.failed ? "ring-2 ring-red-300" : ""}`
                        : message.isEmergency
                          ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700"
                          : "pr-4 font-normal text-gray-800"
                    }`}
                  >
                    {message.image && (
                      <div className="mb-2 overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={message.image}
                          alt="Foto terlampir"
                          className="max-h-48 rounded-lg object-cover"
                        />
                      </div>
                    )}
                    {message.isEmergency && <AlertTriangle className="mb-2 h-5 w-5" />}
                    {message.isStreaming && !message.text ? (
                      <TypingIndicator />
                    ) : (
                      <p className="whitespace-pre-line">
                        {message.text.replace(/<SBAR_READY>[\s\S]*/, "")}
                        {message.isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#E07A5F] align-middle" />}
                      </p>
                    )}
                    {!message.isStreaming && message.sources && message.sources.length > 0 && (
                      <SourceList sources={message.sources} />
                    )}
                    {!message.isStreaming && message.sbarComplete && (
                      <TriageCard />
                    )}
                    {!message.isStreaming && message.doctorReferral && (
                      <DoctorCard
                        doctor={message.doctorReferral}
                        onConsult={(query) => handleSendMessage(query)}
                        disabled={isSending || providerBlocked}
                      />
                    )}
                    {!message.isStreaming && message.suggestions && message.suggestions.length > 0 && (
                      <SuggestionChips
                        suggestions={message.suggestions}
                        onSelect={(query) => handleSendMessage(query)}
                        disabled={isSending || providerBlocked}
                      />
                    )}
                  </div>
                  <span className="px-1 text-[9px] text-gray-400">{message.timestamp}</span>
                </div>
              ))}
            </div>

            {failedMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                <p className="font-semibold">Pesan terakhir belum mendapat jawaban.</p>
                {chatError && <p className="mt-1 text-amber-800">{chatError}</p>}
                <button
                  type="button"
                  disabled={isSending || providerBlocked}
                  onClick={handleRetry}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
                  Coba lagi
                </button>
              </div>
            )}

            {chatError && !failedMessage && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {chatError}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="shrink-0 space-y-1 border-t border-gray-100 bg-white p-3">
            {selectedImage && (
              <div className="relative mb-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="h-16 w-16 rounded-xl border border-gray-200 object-cover shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white shadow hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!historyLoaded || isSending || Boolean(failedMessage) || providerBlocked}
                title="Unggah Foto Hasil Lab atau Makanan"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={input}
                maxLength={2000}
                disabled={!historyLoaded || isSending || Boolean(failedMessage) || providerBlocked}
                onChange={(event) => setInput(event.target.value)}
                placeholder={failedMessage ? "Coba ulang pesan terakhir terlebih dahulu" : selectedImage ? "Tambahkan pertanyaan tentang foto..." : "Tanyakan gula darah, upload lab, atau diet..."}
                className="flex-1 rounded-full border border-transparent bg-[#F0F2F5] px-4 py-2 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white disabled:opacity-60 sm:text-sm"
              />
              <button
                type="submit"
                aria-label="Kirim pesan"
                disabled={!historyLoaded || (!input.trim() && !selectedImage) || isSending || Boolean(failedMessage) || providerBlocked}
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

function ProviderBadge({ status, now }: { status: ProviderStatusView | null; now: number }) {
  const presentation = providerPresentation(status, now);
  return (
    <div className="mt-2 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-[9px] font-semibold text-white/90">
        <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClass}`} />
        {presentation.label}
      </span>
    </div>
  );
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="mt-3 border-t border-gray-200 pt-2 text-[10px] text-gray-500">
      <p className="mb-1.5 flex items-center gap-1 font-bold uppercase tracking-wide text-[#0D5C46]">
        <BookOpen className="h-3 w-3" /> Referensi knowledge base
      </p>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source.source} title={source.source}>• {source.title}</li>
        ))}
      </ul>
    </div>
  );
}

function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[];
  onSelect: (query: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-gray-200/80 pt-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0D5C46]">
        <Sparkles className="h-3.5 w-3.5 text-[#E07A5F]" />
        <span>Rekomendasi pertanyaan lanjutan:</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className="group flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#0D5C46]/20 bg-emerald-50/70 px-3 py-2 text-left text-xs font-medium text-[#0D5C46] transition-all duration-200 hover:border-[#0D5C46] hover:bg-[#0D5C46] hover:text-white active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{suggestion}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DoctorCard({
  doctor,
  onConsult,
  disabled,
}: {
  doctor: DoctorRef;
  onConsult: (query: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#0D5C46]/20 bg-emerald-50/40 p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#0D5C46]/30">
          <Image src={doctor.image || "/images/doctor_1.png"} alt={doctor.name} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-bold text-[#0D5C46]">{doctor.name}</h4>
          <p className="truncate text-[10px] text-gray-600">{doctor.specialty} · {doctor.experience}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onConsult(doctor.query)}
        className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#0D5C46] py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#094232] active:scale-95 disabled:opacity-50"
      >
        <Stethoscope className="h-3.5 w-3.5" />
        <span>Konsultasi Sekarang</span>
      </button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1 text-gray-500">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F] [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E07A5F] [animation-delay:0.4s]" />
      <span className="ml-1 text-xs text-gray-400">Menyiapkan jawaban...</span>
    </div>
  );
}

function TriageCard() {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
      <div className="flex items-start gap-2">
        <div className="rounded-full bg-blue-100 p-1.5 text-blue-600">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-blue-900">Ringkasan Triase Tersimpan</h4>
          <p className="mt-0.5 text-[10px] text-blue-700 leading-relaxed">
            Data keluhan medis awal Anda telah direkam dalam format standar klinis (SBAR). Riwayat ini akan diteruskan ke dokter spesialis saat Anda melakukan konsultasi.
          </p>
        </div>
      </div>
    </div>
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
    sources: message.sources,
    timestamp: formatTime(new Date(message.createdAt)),
    persisted: true,
  };
}

function updateMessage(messages: Message[], id: string, changes: Partial<Message>) {
  return messages.map((message) => message.id === id ? { ...message, ...changes } : message);
}

function isStreamMeta(value: unknown): value is StreamMeta {
  return Boolean(
    value &&
    typeof value === "object" &&
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    "sources" in value &&
    Array.isArray(value.sources) &&
    "isEmergency" in value &&
    typeof value.isEmergency === "boolean",
  );
}

function isStreamToken(value: unknown): value is StreamToken {
  return Boolean(value && typeof value === "object" && "token" in value && typeof value.token === "string");
}

function isProviderBlocked(status: ProviderStatusView | null, now: number) {
  if (!status) return false;
  if (status.status === "NOT_CONFIGURED") return true;
  return status.status !== "READY" && (!status.retryAt || status.retryAt > now);
}

function providerPresentation(status: ProviderStatusView | null, now: number) {
  if (!status) return { label: "Memeriksa provider AI...", dotClass: "animate-pulse bg-white/60" };
  if (status.status === "READY") return { label: "Provider AI siap", dotClass: "bg-emerald-300" };
  if (status.status === "NOT_CONFIGURED") {
    return { label: "Provider AI belum dikonfigurasi", dotClass: "bg-red-300" };
  }

  const seconds = status.retryAt ? Math.max(0, Math.ceil((status.retryAt - now) / 1_000)) : 0;
  const countdown = seconds > 0 ? ` · coba lagi ${formatCountdown(seconds)}` : "";
  if (status.status === "RATE_LIMITED") {
    return { label: `Kuota provider AI sedang dibatasi${countdown}`, dotClass: "bg-amber-300" };
  }
  return { label: `Provider AI tidak tersedia${countdown}`, dotClass: "bg-red-300" };
}

function updateProviderFromError(
  error: unknown,
  update: React.Dispatch<React.SetStateAction<ProviderStatusView | null>>,
) {
  if (!(error instanceof ApiError)) return;
  const retryAfterSeconds = readRetryAfterSeconds(error.details);
  const status: ProviderState | undefined = error.code === "AI_RATE_LIMITED"
    ? "RATE_LIMITED"
    : error.code === "CHATBOT_NOT_CONFIGURED"
      ? "NOT_CONFIGURED"
      : error.code.startsWith("AI_")
        ? "UNAVAILABLE"
        : undefined;
  if (!status) return;

  update((current) => ({
    provider: "groq",
    model: current?.model ?? "",
    status,
    ...(retryAfterSeconds
      ? { retryAfterSeconds, retryAt: Date.now() + retryAfterSeconds * 1_000 }
      : {}),
  }));
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const retryAfterSeconds = readRetryAfterSeconds(error.details);
    if (retryAfterSeconds) {
      return `${error.message} Coba lagi dalam ${formatCountdown(Math.ceil(retryAfterSeconds))}.`;
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
