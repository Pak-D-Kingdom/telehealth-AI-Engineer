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
  Camera,
  MessageSquarePlus,
  RefreshCw,
  RotateCcw,
  Send,
  ShoppingCart,
  Stethoscope,
  Syringe,
  Utensils,
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

const MAX_IMAGES = 4;

interface ChatSource {
  title: string;
  source: string;
}

interface FoodItem {
  name: string;
  category: string;
  portion: string;
  estimated_weight_grams?: number;
  carbs_grams?: number;
  protein_grams?: number;
  calories?: number;
}

interface TotalNutrition {
  weight_grams: number;
  carbs_grams: number;
  protein_grams: number;
  calories: number;
}

interface FoodAnalysis {
  label?: string;
  detected_items: FoodItem[];
  estimated_carbs_grams: number[];
  glycemic_impact: string;
  balance_score: number;
  balance_assessment: string;
  advice: string;
  is_diabetes_friendly: boolean;
  suggested_questions: string[];
  disclaimer?: string;
  total_nutrition?: TotalNutrition;
}

interface FoodComparison {
  better_choice: string;
  comparison_text: string;
  recommendation: string;
  suggested_questions: string[];
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
  images?: string[];
  foodAnalyses?: FoodAnalysis[];
  comparison?: FoodComparison;
  suggestedQuestions?: string[];
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
  | "READY"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED";

interface ProviderStatus {
  provider: "groq" | "9router";
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<RelatedCareDoctor | null>(
    null,
  );
  const [bookingManagementOpen, setBookingManagementOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatusView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledInitialQueryRef = useRef<string | null>(null);
  const latestFoodContextRef = useRef("");

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
        provider: "groq",
        model: "",
        status: "READY",
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isAnalyzing, chatError, selectedImages]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showResetModal) setShowResetModal(false);
        else if (bookingDoctor) setBookingDoctor(null);
        else if (bookingManagementOpen) setBookingManagementOpen(false);
        else onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookingDoctor, bookingManagementOpen, showResetModal, isOpen, onClose]);

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

    if (initialQuery && handledInitialQueryRef.current !== initialQuery) {
      handledInitialQueryRef.current = initialQuery;
      sendMessage(initialQuery);
    }
  }, [initialQuery, isOpen, sendMessage]);

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    sendMessage(query);
    if (!textToSend && query.trim()) setInput("");
  };

  const handleResetChat = async () => {
    setIsSending(true);
    try {
      await apiRequest("/api/chat", { method: "DELETE" });
      setMessages([]);
      setInput("");
      setSelectedImages([]);
      setChatError(null);
      latestFoodContextRef.current = "";
      setConsentGranted(false);
      setHistoryLoaded(false);
    } catch (error) {
      setChatError(errorMessage(error));
    } finally {
      setIsSending(false);
      setShowResetModal(false);
    }
  };

  const handleRetry = async () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.sender === "user");
    if (!lastUserMessage) return;

    await streamResponse(
      "/api/chat/retry/stream",
      { consentToDataProcessing: true },
      lastUserMessage.id,
    );
  };

  const handleBuyProduct = (product: RelatedCareProduct) => {
    addProductToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
    });
    router.push("/checkout");
  };

  const handleViewCatalogItem = (type: "product" | "doctor", slug: string) => {
    router.push(`/#${type === "product" ? "obat" : "dokter"}`);
    onClose();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - selectedImages.length;
    if (files.length > remaining) {
      alert(`Maksimal ${MAX_IMAGES} gambar per analisis`);
    }
    const toProcess = files.slice(0, Math.max(0, remaining));

    toProcess.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" terlalu besar (maks 5MB)`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert(`"${file.name}" bukan gambar`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const stripBase64 = (dataUrl: string) => dataUrl.split(",")[1] || dataUrl;

  const handleAnalyzeFood = async () => {
    if (!selectedImages.length || isAnalyzing) return;

    setIsAnalyzing(true);
    const images = [...selectedImages];

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text:
        images.length > 1
          ? `📸 Bandingkan ${images.length} foto makanan`
          : "📸 Analisis foto makanan saya",
      timestamp: formatTime(new Date()),
      images,
    };

    setMessages((prev) => [...prev, userMessage]);
    const aiMessageId = crypto.randomUUID();

    try {
      const response = await apiRequest<ApiResponse<any>>("/api/chat", {
        method: "POST",
        body: {
          message: images.length > 1 ? "Bandingkan foto makanan berikut" : "Analisis foto makanan berikut",
          image: images[0],
          consentToDataProcessing: true,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          sender: "ai",
          text: response.data.reply || "Analisis foto makanan selesai.",
          timestamp: formatTime(new Date()),
          sources: response.data.sources || [],
          relatedCare: response.data.relatedCare,
        },
      ]);
    } catch (error) {
      console.error("Food analyze error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          sender: "ai",
          text: "Maaf, foto makanan belum dapat dianalisis saat ini. Silakan coba lagi.",
          timestamp: formatTime(new Date()),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      setSelectedImages([]);
    }
  };

  const providerBlocked = isProviderBlocked(providerStatus, now);
  const failedMessage = useMemo(
    () => messages.find((message) => message.failed),
    [messages],
  );
  const latestAssistantMessageId = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.sender === "ai" && !message.isStreaming)?.id,
    [messages],
  );

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpen()}
          aria-label="Buka konsultasi GlucoCare AI"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#0D5C46] text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#094232] active:scale-95 sm:h-16 sm:w-16"
        >
          <Stethoscope className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E07A5F] opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[#E07A5F]" />
          </span>
        </button>
      )}

      {/* Main Chat Drawer / Modal */}
      {isOpen && (
        <section
          aria-label="Konsultasi GlucoAssistant"
          className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ${
            isExpanded
              ? "inset-0 h-full w-full rounded-none sm:inset-4 sm:h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:rounded-3xl sm:border sm:border-gray-200"
              : "inset-0 h-full w-full rounded-none sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[640px] sm:w-[420px] sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-gray-200"
          }`}
        >
          {/* Header */}
          <header className="relative flex shrink-0 items-center justify-between border-b border-[#1A8B6B]/80 bg-[#0D5C46] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs">
                <Stethoscope className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight text-white">
                  GlucoAssistant AI
                </h2>
                <p className="text-[10px] font-medium text-emerald-200/90">
                  Edukasi & Skrining Diabetes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ChatPanelSizeToggle
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
              />
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                disabled={isSending}
                title="Reset Percakapan"
                aria-label="Reset Percakapan"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup jendela chat"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Provider Status Indicator */}
          <div className="bg-[#0A4837] py-1">
            <ProviderBadge status={providerStatus} now={now} />
          </div>

          {/* Messages Container */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {messages.length === 0 && (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-[#0D5C46]">
                  <Stethoscope className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">
                    Halo! Ada yang bisa kami bantu?
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Tanyakan keluhan gula darah, obat, nutrisi, atau unggah foto makanan untuk dianalisis.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                  <TopicButton
                    icon={<Syringe className="h-4 w-4 text-emerald-600" />}
                    label="Gula darah puasa saya di atas 140 mg/dL"
                    onClick={() =>
                      handleSendMessage(
                        "Gula darah puasa saya di atas 140 mg/dL, apa langkah awal yang aman?",
                      )
                    }
                    color="bg-emerald-50"
                    disabled={!consentGranted || isSending}
                  />
                  <TopicButton
                    icon={<Utensils className="h-4 w-4 text-amber-600" />}
                    label="Panduan pola makan & porsi karbohidrat"
                    onClick={() =>
                      handleSendMessage(
                        "Bagaimana aturan porsi karbohidrat dan pola makan aman diabetes?",
                      )
                    }
                    color="bg-amber-50"
                    disabled={!consentGranted || isSending}
                  />
                  <TopicButton
                    icon={<CalendarSearch className="h-4 w-4 text-teal-600" />}
                    label="Jadwal & Konsultasi Dokter Spesialis"
                    onClick={() =>
                      handleSendMessage(
                        "Saya ingin tahu jadwal dokter spesialis penyakit dalam untuk konsultasi.",
                      )
                    }
                    color="bg-teal-50"
                    disabled={!consentGranted || isSending}
                  />
                </div>
              </div>
            )}

            <div aria-live="polite" className="contents">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`space-y-2 ${
                    message.sender === "user"
                      ? "flex flex-col items-end"
                      : "flex flex-col items-start"
                  }`}
                >
                  <div
                    className={`max-w-[92%] text-sm leading-relaxed sm:max-w-[88%] ${
                      isExpanded ? "sm:max-w-[82%]" : ""
                    } ${
                      message.sender === "user"
                        ? `rounded-2xl rounded-tr-xs bg-[#0D5C46] px-4 py-3 text-white ${
                            message.failed ? "ring-2 ring-red-300" : ""
                          }`
                        : message.isEmergency
                          ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700"
                          : "pr-4 font-normal text-gray-800"
                    }`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.images.map((img, i) => (
                          <div
                            key={i}
                            className="relative h-16 w-16 rounded-xl overflow-hidden border border-white/20"
                          >
                            <Image
                              src={img}
                              alt="Upload"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

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

            {/* Selected Images Preview Bar */}
            {selectedImages.length > 0 && (
              <div className="rounded-2xl border border-dashed border-[#0D5C46]/30 bg-emerald-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#0D5C46] mb-2">
                  <span>Foto Makanan Siap Analisis ({selectedImages.length}/{MAX_IMAGES})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative h-16 w-16 rounded-xl overflow-hidden border border-emerald-300"
                    >
                      <Image
                        src={img}
                        alt={`Preview ${i}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {selectedImages.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#0D5C46] hover:text-[#0D5C46] transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-[9px] mt-0.5">Tambah</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeFood}
                  disabled={isAnalyzing}
                  className="mt-2 w-full py-2 bg-[#0D5C46] hover:bg-[#094232] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Utensils className="h-3.5 w-3.5" />
                  {isAnalyzing
                    ? "Menganalisis Makanan..."
                    : selectedImages.length > 1
                      ? `Bandingkan ${selectedImages.length} Makanan`
                      : "Analisis Nutrisi Makanan"}
                </button>
              </div>
            )}

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

          {/* Footer & Input Area */}
          <footer
            className={`shrink-0 space-y-1 border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 ${
              isExpanded ? "sm:px-6 sm:py-4" : ""
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

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
                  untuk edukasi dan tindak lanjut medis.
                </span>
              </label>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!consentGranted || isSending || isAnalyzing}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                title="Unggah Foto Makanan"
              >
                <Camera className="h-4 w-4" />
              </button>

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
                      : "Tanyakan gula darah, gejala, atau foto makanan..."
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

          {/* Modern Reset Modal Popup inside ChatBot */}
          {showResetModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-[280px] rounded-3xl border border-[#EAE4DC] bg-white p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-200 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <RotateCcw className="h-5 w-5" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-[#0D5C46]">Reset Percakapan?</h3>
                  <p className="text-xs text-[#6B7C72] leading-relaxed">
                    Riwayat pesan akan dihapus dan Anda akan memulai konsultasi baru.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="cursor-pointer flex-1 rounded-xl border border-[#EAE4DC] bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="cursor-pointer flex-1 rounded-xl bg-[#0D5C46] hover:bg-[#094232] py-2 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    Ya, Reset
                  </button>
                </div>
              </div>
            </div>
          )}

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
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-0.5 text-[9px] font-semibold text-white/90">
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
