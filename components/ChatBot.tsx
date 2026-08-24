"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CalendarSearch,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShoppingCart,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";
import { ApiError, apiRequest, streamApiRequest } from "@/lib/api-client";
import type {
  ApiResponse,
  ChatFeedback,
  ChatFeedbackRating,
  ChatFeedbackReason,
  RelatedCareDoctor,
  RelatedCareOptions,
  RelatedCareProduct,
} from "@/lib/api-types";
import { addProductToCart } from "@/lib/cart";
import { isBookingManagementIntent } from "@/lib/consultation";
import ChatFeedbackControls from "@/components/ChatFeedbackControls";
import ChatPanelSizeToggle from "@/components/ChatPanelSizeToggle";
import MarkdownMessage from "@/components/MarkdownMessage";
import RelatedCareCards from "@/components/RelatedCareCards";
import DoctorBookingPanel from "@/components/DoctorBookingPanel";
import BookingManagementPanel from "@/components/BookingManagementPanel";

interface ChatSource {
  title: string;
  source: string;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  sources?: ChatSource[];
  isEmergency?: boolean;
  isStreaming?: boolean;
  failed?: boolean;
  persisted?: boolean;
  persistedId?: string;
  feedback?: ChatFeedback;
  relatedCare?: RelatedCareOptions;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[];
  createdAt: string;
  feedback?: ChatFeedback;
  relatedCare?: RelatedCareOptions;
}

interface ChatHistory {
  sessionId: string;
  consentGranted: boolean;
  messages: StoredMessage[];
}

type ProviderState =
  "READY" | "RATE_LIMITED" | "UNAVAILABLE" | "NOT_CONFIGURED";

interface ProviderStatus {
  provider: "9router";
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
  relatedCare?: RelatedCareOptions;
}

interface StreamToken {
  token: string;
}

interface StreamCompletion {
  messageId: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onOpen: (query?: string) => void;
  onClose: () => void;
  initialQuery?: string;
}

export default function ChatBot({
  isOpen,
  onOpen,
  onClose,
  initialQuery,
}: ChatBotProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<RelatedCareDoctor | null>(
    null,
  );
  const [bookingManagementOpen, setBookingManagementOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatusView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledInitialQueryRef = useRef<string | null>(null);

  const refreshProviderStatus = useCallback(async () => {
    try {
      const response =
        await apiRequest<ApiResponse<ProviderStatus>>("/api/chat/status");
      setProviderStatus({
        ...response.data,
        ...(response.data.retryAfterSeconds
          ? { retryAt: Date.now() + response.data.retryAfterSeconds * 1_000 }
          : {}),
      });
    } catch {
      setProviderStatus({
        provider: "9router",
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (bookingDoctor) setBookingDoctor(null);
        else if (bookingManagementOpen) setBookingManagementOpen(false);
        else onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookingDoctor, bookingManagementOpen, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const initialRefresh = window.setTimeout(
      () => void refreshProviderStatus(),
      0,
    );
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    const refresh = window.setInterval(
      () => void refreshProviderStatus(),
      15_000,
    );
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
        const response =
          await apiRequest<ApiResponse<ChatHistory>>("/api/chat");
        if (!cancelled) {
          setConsentGranted(response.data.consentGranted);
          setMessages(
            response.data.messages.map((message, index, all) => ({
              ...toUiMessage(message),
              failed: index === all.length - 1 && message.role === "user",
            })),
          );
        }
      } catch (error) {
        if (
          !cancelled &&
          (!(error instanceof ApiError) || error.status !== 401)
        ) {
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

  const streamResponse = useCallback(
    async (
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
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId
              ? { ...message, text: message.text + tokens }
              : message,
          ),
        );
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
        await streamApiRequest(
          path,
          { method: "POST", body },
          ({ event, data }) => {
            if (event === "meta" && isStreamMeta(data)) {
              setMessages((previous) =>
                updateMessage(previous, assistantMessageId, {
                  sources: data.sources,
                  isEmergency: data.isEmergency,
                  relatedCare: data.relatedCare,
                }).map((message) =>
                  message.id === userMessageId
                    ? { ...message, persisted: true }
                    : message,
                ),
              );
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

            if (event === "done" && isStreamCompletion(data)) {
              if (animationFrame !== undefined)
                window.cancelAnimationFrame(animationFrame);
              animationFrame = undefined;
              flushTokens();
              completed = true;
              setMessages((previous) =>
                updateMessage(previous, assistantMessageId, {
                  isStreaming: false,
                  persistedId: data.messageId,
                  timestamp: formatTime(new Date()),
                }),
              );
            }
          },
        );

        if (!completed) {
          throw new ApiError(
            502,
            "STREAM_INTERRUPTED",
            "Jawaban terputus sebelum selesai. Silakan coba lagi.",
          );
        }
      } catch (error) {
        if (animationFrame !== undefined)
          window.cancelAnimationFrame(animationFrame);
        setMessages((previous) =>
          previous
            .filter((message) => message.id !== assistantMessageId)
            .map((message) =>
              message.id === userMessageId
                ? { ...message, failed: true }
                : message,
            ),
        );
        setChatError(errorMessage(error));
        updateProviderFromError(error, setProviderStatus);
      } finally {
        setIsSending(false);
        void refreshProviderStatus();
      }
    },
    [refreshProviderStatus],
  );

  const submitFeedback = useCallback(
    async (
      messageId: string,
      rating: ChatFeedbackRating,
      reason?: ChatFeedbackReason,
    ) => {
      const response = await apiRequest<
        ApiResponse<ChatFeedback & { messageId: string }>
      >(`/api/chat/messages/${messageId}/feedback`, {
        method: "POST",
        body: { rating, reason },
      });
      setMessages((previous) =>
        previous.map((message) =>
          message.persistedId === messageId || message.id === messageId
            ? { ...message, feedback: response.data }
            : message,
        ),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        sender: "user",
        text: query,
        timestamp: formatTime(new Date()),
        persisted: false,
      };

      setMessages((previous) => [...previous, userMessage]);
      await streamResponse(
        "/api/chat/stream",
        { message: query, consentToDataProcessing: true },
        userMessage.id,
      );
    },
    [streamResponse],
  );

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
      setInput(initialQuery);
    }
  }, [historyLoaded, initialQuery, isOpen]);

  const failedMessage = useMemo(
    () =>
      messages.findLast(
        (message) => message.sender === "user" && message.failed,
      ),
    [messages],
  );
  const latestAssistantMessageId = useMemo(
    () =>
      messages.findLast(
        (message) => message.sender === "ai" && !message.isStreaming,
      )?.id,
    [messages],
  );
  const providerBlocked = isProviderBlocked(providerStatus, now);

  const handleSendMessage = (query = input) => {
    const normalizedQuery = query.trim();
    if (isBookingManagementIntent(normalizedQuery)) {
      if (query === input) setInput("");
      setBookingManagementOpen(true);
      return;
    }
    if (
      isSending ||
      !historyLoaded ||
      !consentGranted ||
      failedMessage ||
      providerBlocked ||
      !normalizedQuery
    )
      return;
    if (query === input) setInput("");
    void sendMessage(query);
  };

  const handleRetry = () => {
    if (!failedMessage || !consentGranted || isSending || providerBlocked)
      return;
    setMessages((previous) =>
      updateMessage(previous, failedMessage.id, { failed: false }),
    );
    void streamResponse(
      failedMessage.persisted ? "/api/chat/retry/stream" : "/api/chat/stream",
      failedMessage.persisted
        ? { consentToDataProcessing: true }
        : { message: failedMessage.text, consentToDataProcessing: true },
      failedMessage.id,
    );
  };

  const handleNewConversation = async () => {
    if (isSending || isResetting) return;
    if (
      messages.length > 0 &&
      !window.confirm("Mulai percakapan baru? Riwayat saat ini akan ditutup.")
    ) {
      return;
    }

    setIsResetting(true);
    setChatError(null);
    try {
      await apiRequest<void>("/api/chat", { method: "DELETE" });
      setMessages([]);
      setInput("");
      setConsentGranted(false);
      setBookingManagementOpen(false);
      setHistoryLoaded(true);
      await refreshProviderStatus();
    } catch (error) {
      setChatError(errorMessage(error));
    } finally {
      setIsResetting(false);
    }
  };

  const handleViewCatalogItem = (kind: "product" | "doctor", slug: string) => {
    onClose();
    router.push(`/#${kind}-${slug}`);
  };

  const handleBuyProduct = (product: RelatedCareProduct) => {
    const added = addProductToCart(product);
    if (!added) {
      setChatError("Produk belum dapat ditambahkan. Silakan coba lagi.");
      return;
    }

    onClose();
    router.push("/checkout");
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
              <Image
                src="/images/glucocare_logo.svg"
                alt="GlucoAssistant"
                fill
                className="object-cover"
              />
            </div>
            <div className="pr-1 text-left">
              <div className="text-sm font-extrabold leading-tight text-[#0D5C46]">
                GlucoAssistant
              </div>
              <div className="text-[10px] font-semibold text-[#E07A5F]">
                Asisten virtual GlucoCare
              </div>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <section
          id="glucocare-chat-panel"
          role="dialog"
          aria-label="Percakapan dengan GlucoAssistant"
          aria-modal="false"
          className={`fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden overscroll-contain bg-white shadow-2xl transition-[width,height,border-radius] duration-300 ease-out motion-reduce:transition-none sm:inset-auto sm:bottom-6 sm:right-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:border sm:border-[#E8E4DE] ${
            isExpanded
              ? "sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[min(760px,calc(100vw-3rem))]"
              : "sm:h-[620px] sm:w-[420px]"
          }`}
        >
          <header className="shrink-0 bg-[#0D5C46] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-sm sm:py-3">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <button
                type="button"
                aria-label="Tutup percakapan"
                title="Tutup percakapan"
                onClick={onClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-center justify-center gap-2">
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/30">
                  <Image
                    src="/images/glucocare_logo.svg"
                    alt="GlucoAssistant"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="truncate text-sm font-bold tracking-tight">
                  GlucoAssistant{" "}
                  <span className="ml-0.5 hidden text-[10px] font-normal text-[#F4A261] min-[380px]:inline">
                    Asisten Edukasi
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ChatPanelSizeToggle
                  isExpanded={isExpanded}
                  onToggle={() => setIsExpanded((current) => !current)}
                />
                <button
                  type="button"
                  aria-label="Mulai percakapan baru"
                  title="Mulai percakapan baru"
                  disabled={isSending || isResetting}
                  onClick={() => void handleNewConversation()}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ProviderBadge status={providerStatus} now={now} />
          </header>

          <div
            className={`flex-1 space-y-6 overflow-y-auto overscroll-contain bg-white p-4 ${isExpanded ? "sm:p-6" : ""}`}
          >
            {!historyLoaded && (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-400">
                Memuat percakapan...
              </div>
            )}

            {historyLoaded && messages.length === 0 && (
              <div className="space-y-6 px-2 pt-4 text-center">
                <div className="space-y-3">
                  <p className="text-sm font-medium leading-relaxed text-gray-700">
                    Hai, saya{" "}
                    <strong className="text-[#0D5C46]">GlucoAssistant</strong>.
                    Saya membantu menjelaskan diabetes dengan bahasa sederhana,
                    mengenali tanda darurat, dan menemukan tenaga medis yang
                    sesuai.
                  </p>
                  <p className="text-sm text-gray-600">
                    Pilih topik atau tulis pertanyaan Anda.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <TopicButton
                    icon={<ShoppingCart className="h-4 w-4" />}
                    label="Apa arti hasil gula darah puasa saya?"
                    onClick={() =>
                      handleSendMessage(
                        "Apa arti hasil pemeriksaan gula darah puasa secara umum?",
                      )
                    }
                    color="bg-teal-50 text-[#0D5C46]"
                    disabled={isSending || providerBlocked || !consentGranted}
                  />
                  <TopicButton
                    icon={<CalendarSearch className="h-4 w-4" />}
                    label="Cek, ubah, atau batalkan booking"
                    onClick={() => setBookingManagementOpen(true)}
                    color="bg-sky-50 text-sky-700"
                    disabled={false}
                  />
                  <TopicButton
                    icon={<Stethoscope className="h-4 w-4" />}
                    label="Informasi umum tentang Metformin"
                    onClick={() =>
                      handleSendMessage(
                        "Jelaskan informasi umum tentang Metformin tanpa memberikan dosis atau resep.",
                      )
                    }
                    color="bg-emerald-50 text-emerald-600"
                    disabled={isSending || providerBlocked || !consentGranted}
                  />
                  <TopicButton
                    icon={<Syringe className="h-4 w-4" />}
                    label="Luka diabetes lambat sembuh"
                    onClick={() =>
                      handleSendMessage(
                        "Luka diabetes saya lambat sembuh. Kapan saya perlu menemui dokter?",
                      )
                    }
                    color="bg-orange-50 text-[#E07A5F]"
                    disabled={isSending || providerBlocked || !consentGranted}
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
                    className={`max-w-[92%] text-sm leading-relaxed sm:max-w-[88%] ${isExpanded ? "sm:max-w-[82%]" : ""} ${
                      message.sender === "user"
                        ? `rounded-2xl rounded-tr-xs bg-[#0D5C46] px-4 py-3 text-white ${message.failed ? "ring-2 ring-red-300" : ""}`
                        : message.isEmergency
                          ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700"
                          : "pr-4 font-normal text-gray-800"
                    }`}
                  >
                    {message.isEmergency && (
                      <AlertTriangle className="mb-2 h-5 w-5" />
                    )}
                    {message.isStreaming && !message.text ? (
                      <TypingIndicator />
                    ) : (
                      <div>
                        <MarkdownMessage
                          variant={
                            message.sender === "user" ? "inverse" : "default"
                          }
                        >
                          {message.text}
                        </MarkdownMessage>
                        {message.isStreaming && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#E07A5F] align-middle" />
                        )}
                      </div>
                    )}
                    {!message.isStreaming &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <SourceList sources={message.sources} />
                      )}
                    {!message.isStreaming && message.relatedCare && (
                      <RelatedCareCards
                        options={message.relatedCare}
                        onSelect={handleSendMessage}
                        onViewProduct={(product: RelatedCareProduct) =>
                          handleViewCatalogItem("product", product.slug)
                        }
                        onBuyProduct={handleBuyProduct}
                        onViewDoctor={(doctor: RelatedCareDoctor) =>
                          handleViewCatalogItem("doctor", doctor.slug)
                        }
                        onBookDoctor={setBookingDoctor}
                        disabled={
                          isSending || providerBlocked || !consentGranted
                        }
                        showSuggestions={
                          message.id === latestAssistantMessageId
                        }
                      />
                    )}
                  </div>
                  {message.sender === "ai" &&
                    !message.isStreaming &&
                    message.persistedId && (
                      <ChatFeedbackControls
                        value={message.feedback}
                        onSubmit={(rating, reason) =>
                          submitFeedback(message.persistedId!, rating, reason)
                        }
                      />
                    )}
                  <span className="px-1 text-[9px] text-gray-400">
                    {message.timestamp}
                  </span>
                </div>
              ))}
            </div>

            {failedMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                <p className="font-semibold">
                  Pesan terakhir belum mendapat jawaban.
                </p>
                {chatError && (
                  <p className="mt-1 text-amber-800">{chatError}</p>
                )}
                <button
                  type="button"
                  disabled={!consentGranted || isSending || providerBlocked}
                  onClick={handleRetry}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`}
                  />
                  Coba lagi
                </button>
              </div>
            )}

            {chatError && !failedMessage && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {chatError}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer
            className={`shrink-0 space-y-1 border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 ${isExpanded ? "sm:px-6 sm:py-4" : ""}`}
          >
            {!consentGranted && (
              <label className="mb-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E8DFC0] bg-[#FFF9F3] px-3 py-2.5 text-[10px] leading-relaxed text-[#4A5550]">
                <input
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(event) => setConsentGranted(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#0D5C46]"
                />
                <span>
                  Saya setuju isi percakapan dan data kontak digunakan GlucoCare
                  untuk menjawab pertanyaan dan tindak lanjut. Untuk membuat
                  jawaban, GlucoCare memakai layanan AI pihak ketiga.
                </span>
              </label>
            )}
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
                disabled={
                  !historyLoaded ||
                  !consentGranted ||
                  isSending ||
                  Boolean(failedMessage) ||
                  providerBlocked
                }
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  !consentGranted
                    ? "Setujui penggunaan data untuk mulai bertanya"
                    : failedMessage
                      ? "Coba ulang pesan terakhir terlebih dahulu"
                      : "Tanyakan gula darah, gejala, atau diabetes..."
                }
                className="flex-1 rounded-full border border-transparent bg-[#F0F2F5] px-4 py-2.5 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white disabled:opacity-60 sm:text-sm"
              />
              <button
                type="submit"
                aria-label="Kirim pesan"
                disabled={
                  !historyLoaded ||
                  !consentGranted ||
                  !input.trim() ||
                  isSending ||
                  Boolean(failedMessage) ||
                  providerBlocked
                }
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#E07A5F] text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="flex items-center justify-between px-4 text-[9px] text-gray-400">
              <span>Informasi umum, bukan pengganti konsultasi dokter.</span>
              <span>{input.length}/2000</span>
            </div>
          </footer>
          {bookingDoctor && (
            <DoctorBookingPanel
              doctor={bookingDoctor}
              onClose={() => setBookingDoctor(null)}
            />
          )}
          {bookingManagementOpen && (
            <BookingManagementPanel
              onClose={() => setBookingManagementOpen(false)}
            />
          )}
        </section>
      )}
    </>
  );
}

function ProviderBadge({
  status,
  now,
}: {
  status: ProviderStatusView | null;
  now: number;
}) {
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
        <BookOpen className="h-3 w-3" /> Sumber informasi
      </p>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source.source} title={source.source}>
            • {source.title}
          </li>
        ))}
      </ul>
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
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
        {label}
      </span>
    </button>
  );
}

function toUiMessage(message: StoredMessage): Message {
  return {
    id: message.id,
    sender: message.role === "assistant" ? "ai" : "user",
    text: message.content,
    sources: message.sources,
    relatedCare: message.relatedCare,
    feedback: message.feedback,
    timestamp: formatTime(new Date(message.createdAt)),
    persisted: true,
    persistedId: message.id,
  };
}

function updateMessage(
  messages: Message[],
  id: string,
  changes: Partial<Message>,
) {
  return messages.map((message) =>
    message.id === id ? { ...message, ...changes } : message,
  );
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
    typeof value.isEmergency === "boolean" &&
    (!("relatedCare" in value) ||
      value.relatedCare === undefined ||
      isRelatedCareOptions(value.relatedCare)),
  );
}

function isRelatedCareOptions(value: unknown): value is RelatedCareOptions {
  return Boolean(
    value &&
    typeof value === "object" &&
    "reason" in value &&
    typeof value.reason === "string" &&
    "disclaimer" in value &&
    typeof value.disclaimer === "string" &&
    "products" in value &&
    Array.isArray(value.products) &&
    "doctors" in value &&
    Array.isArray(value.doctors),
  );
}

function isStreamToken(value: unknown): value is StreamToken {
  return Boolean(
    value &&
    typeof value === "object" &&
    "token" in value &&
    typeof value.token === "string",
  );
}

function isStreamCompletion(value: unknown): value is StreamCompletion {
  return Boolean(
    value &&
    typeof value === "object" &&
    "messageId" in value &&
    typeof value.messageId === "string",
  );
}

function isProviderBlocked(status: ProviderStatusView | null, now: number) {
  if (!status) return false;
  if (status.status === "NOT_CONFIGURED") return true;
  return status.status !== "READY" && (!status.retryAt || status.retryAt > now);
}

function providerPresentation(status: ProviderStatusView | null, now: number) {
  if (!status)
    return {
      label: "Memeriksa kesiapan layanan...",
      dotClass: "animate-pulse bg-white/60",
    };
  if (status.status === "READY")
    return { label: "Asisten siap membantu", dotClass: "bg-emerald-300" };
  if (status.status === "NOT_CONFIGURED") {
    return { label: "Layanan belum siap", dotClass: "bg-red-300" };
  }

  const seconds = status.retryAt
    ? Math.max(0, Math.ceil((status.retryAt - now) / 1_000))
    : 0;
  const countdown =
    seconds > 0 ? ` · coba lagi ${formatCountdown(seconds)}` : "";
  if (status.status === "RATE_LIMITED") {
    return {
      label: `Banyak pengguna sedang bertanya${countdown}`,
      dotClass: "bg-amber-300",
    };
  }
  return {
    label: `Asisten sedang tidak tersedia${countdown}`,
    dotClass: "bg-red-300",
  };
}

function updateProviderFromError(
  error: unknown,
  update: React.Dispatch<React.SetStateAction<ProviderStatusView | null>>,
) {
  if (!(error instanceof ApiError)) return;
  const retryAfterSeconds = readRetryAfterSeconds(error.details);
  const status: ProviderState | undefined =
    error.code === "AI_RATE_LIMITED"
      ? "RATE_LIMITED"
      : error.code === "CHATBOT_NOT_CONFIGURED"
        ? "NOT_CONFIGURED"
        : error.code.startsWith("AI_")
          ? "UNAVAILABLE"
          : undefined;
  if (!status) return;

  update((current) => ({
    provider: "9router",
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
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const retryAfterSeconds = readRetryAfterSeconds(error.details);
    if (retryAfterSeconds) {
      return `${error.message} Coba lagi dalam ${formatCountdown(Math.ceil(retryAfterSeconds))}.`;
    }
    return error.message;
  }

  return "GlucoAssistant belum dapat dihubungi. Periksa koneksi internet, lalu coba lagi.";
}

function readRetryAfterSeconds(details: unknown) {
  if (
    !details ||
    typeof details !== "object" ||
    !("retryAfterSeconds" in details)
  ) {
    return undefined;
  }

  const value = details.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}
