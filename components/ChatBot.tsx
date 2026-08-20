"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Send,
  ShoppingCart,
  Stethoscope,
  Syringe,
  ChevronRight,
  ArrowRight,
  Camera,
  Utensils,
  Trash2,
  Scale,
  MessageCircle,
} from "lucide-react";

const AI_AGENT_URL =
  process.env.NEXT_PUBLIC_AI_AGENT_URL || "http://localhost:8000";

const MAX_IMAGES = 4;

const createMessageId = (prefix = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
  carousel?: ProductRec[];
  doctorReferral?: DoctorRef;
  images?: string[];
  foodAnalyses?: FoodAnalysis[];
  comparison?: FoodComparison;
  suggestedQuestions?: string[];
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
  const [isTyping, setIsTyping] = useState(false);
  const [cart, setCart] = useState<{
    [key: string]: { rec: ProductRec; qty: number };
  }>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledInitialQueryRef = useRef<string | null>(null);
  const latestFoodContextRef = useRef("");

  useEffect(() => {
    const stored = localStorage.getItem("gluco_chat_session_id");
    if (stored) {
      setSessionId(stored);
    } else {
      const newId =
        "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("gluco_chat_session_id", newId);
      setSessionId(newId);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isAnalyzing, selectedImages]);

  const generateAIResponse = useCallback(
    async (userText: string) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
      try {
        const messageForAI = latestFoodContextRef.current
          ? `${userText}\n\nKONTEKS ANALISIS MAKANAN TERAKHIR:\n${latestFoodContextRef.current}`
          : userText;
        const response = await fetch(`${AI_AGENT_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: sessionId,
            message: messageForAI,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI Agent error: ${response.status}`);
        }

        const data = await response.json();

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId("ai"),
              sender: "ai",
              text: data.response_text,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              carousel: data.products || [],
              doctorReferral: data.doctor || undefined,
              suggestedQuestions: data.suggested_questions || [],
            },
          ]);
        }, 500);
      } catch (error) {
        console.error("AI Agent error:", error);
        const isTimeout =
          error instanceof Error && error.name === "AbortError";
        const fallbackText = isTimeout
          ? "Layanan AI memerlukan waktu lebih lama untuk merespons. Silakan coba kirim ulang pertanyaan Anda."
          : "Maaf, saya sedang mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.";

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId("ai-err"),
              sender: "ai",
              text: fallbackText,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }, 500);
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [sessionId],
  );

  const sendMessage = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      const userMessage: Message = {
        id: createMessageId("user"),
        sender: "user",
        text: query,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      generateAIResponse(query);
    },
    [generateAIResponse],
  );

  const stripBase64 = (dataUrl: string) => dataUrl.split(",")[1] || dataUrl;

  const buildFoodContext = (analyses: FoodAnalysis[], comparison?: FoodComparison) => {
    const summary = analyses.map((analysis, index) => {
      const nutrition = analysis.total_nutrition;
      return `Gambar ${index + 1}: karbo ${nutrition?.carbs_grams ?? "?"}g, protein ${nutrition?.protein_grams ?? "?"}g, kalori ${nutrition?.calories ?? "?"}, dampak glikemik ${analysis.glycemic_impact}, skor ${analysis.balance_score}/10, saran: ${analysis.advice}`;
    });
    const comparisonSummary = comparison
      ? `Pilihan lebih baik: ${comparison.better_choice}. ${comparison.comparison_text} Rekomendasi: ${comparison.recommendation}`
      : "";
    return [...summary, comparisonSummary].filter(Boolean).join("\n");
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

  const handleAnalyzeFood = async () => {
    if (!selectedImages.length || isAnalyzing) return;

    setIsAnalyzing(true);
    const images = [...selectedImages];

    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId("user-food"),
        sender: "user",
        text:
          images.length > 1
            ? `📸 Bandingkan ${images.length} foto makanan`
            : "📸 Analisis foto makanan saya",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        images,
      },
    ]);

    const aiMessageId = createMessageId("ai-food");

    try {
      let foodAnalyses: FoodAnalysis[] = [];
      let comparison: FoodComparison | undefined;

      if (images.length === 1) {
        const response = await fetch(`${AI_AGENT_URL}/api/food/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: stripBase64(images[0]),
            user_note: "",
          }),
        });
        if (!response.ok) throw new Error(`Analyze error: ${response.status}`);
        const result: FoodAnalysis = await response.json();
        result.label = "Gambar 1";
        foodAnalyses = [result];
        latestFoodContextRef.current = buildFoodContext(foodAnalyses);
      } else {
        const response = await fetch(`${AI_AGENT_URL}/api/food/compare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: images.map(stripBase64),
            user_note: "",
          }),
        });
        if (!response.ok) throw new Error(`Compare error: ${response.status}`);
        const result = await response.json();
        foodAnalyses = result.analyses || [];
        comparison = result.comparison || undefined;
        latestFoodContextRef.current = buildFoodContext(foodAnalyses, comparison);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          sender: "ai",
          text: "",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          foodAnalyses,
          comparison,
        },
      ]);
    } catch (error) {
      console.error("Food analyze error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          sender: "ai",
          text: "Maaf, saya tidak dapat menganalisis gambar ini.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      setSelectedImages([]);
    }
  };

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
        [product.id]: { rec: product, qty: newQty },
      };
    });
  };

  const totalCartItems = Object.values(cart).reduce(
    (sum, item) => sum + item.qty,
    0,
  );
  const totalCartPrice = Object.values(cart).reduce(
    (sum, item) => sum + item.rec.price * item.qty,
    0,
  );

  const formatRupiah = (val: number) => {
    return "Rp" + val.toLocaleString("id-ID");
  };

  const getGlycemicColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case "rendah":
        return "text-emerald-600 bg-emerald-50";
      case "sedang":
        return "text-amber-600 bg-amber-50";
      case "tinggi":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const renderFoodCard = (fa: FoodAnalysis, index: number, total: number) => (
    <div
      key={index}
      className="w-full bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-[#0D5C46]/20 rounded-2xl p-4 space-y-3 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0D5C46] uppercase tracking-wider">
          <Utensils className="w-4 h-4" />
          <span>Analisis Makanan</span>
        </div>
        {total > 1 && (
          <span className="text-[10px] font-bold bg-[#0D5C46] text-white px-2 py-0.5 rounded-full">
            {fa.label || `Gambar ${index + 1}`}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-700 leading-relaxed">
          {fa.balance_assessment}
        </p>
      </div>

      {fa.total_nutrition && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Karbo</div>
            <div className="text-sm font-bold text-amber-600 mt-0.5">
              {fa.total_nutrition.carbs_grams}g
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Protein</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">
              {fa.total_nutrition.protein_grams}g
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Kalori</div>
            <div className="text-sm font-bold text-blue-600 mt-0.5">
              {fa.total_nutrition.calories}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
          Dampak Glikemik:
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${getGlycemicColor(
            fa.glycemic_impact,
          )}`}
        >
          {fa.glycemic_impact}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">
          Skor {fa.balance_score}/10
        </span>
      </div>

      {fa.detected_items?.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
            Item Terdeteksi:
          </div>
          <div className="space-y-2">
            {fa.detected_items.map((item, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-800">{item.name}</span>
                  <span className="text-[10px] text-gray-500">
                    {item.portion} · ±{item.estimated_weight_grams || 0}g
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Karbo {item.carbs_grams || 0}g
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    Protein {item.protein_grams || 0}g
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {item.calories || 0} kkal
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#0D5C46] text-white rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">💡 Saran</div>
        <p className="text-xs leading-relaxed">{fa.advice}</p>
      </div>

      {fa.suggested_questions?.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">
            Pertanyaan lanjutan:
          </div>
          {fa.suggested_questions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="w-full text-left text-[11px] bg-white hover:bg-gray-50 border border-gray-200 hover:border-[#E07A5F] px-3 py-2 rounded-lg text-gray-700 hover:text-[#E07A5F] transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1">{q}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
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
              <div className="font-extrabold text-sm text-[#0D5C46] leading-tight">
                GlucoAssistant
              </div>
              <div className="text-[10px] text-[#E07A5F] font-semibold">
                by GlucoCare AI
              </div>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[620px] max-h-[88vh] bg-white border border-[#E8E4DE] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          <div className="bg-[#0D5C46] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

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
                GlucoAssistant{" "}
                <span className="text-[10px] font-normal text-[#F4A261] ml-0.5">
                  Sp.PD Referral
                </span>
              </span>
            </div>

            <div className="w-8" />
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-white">
            {messages.length === 0 && (
              <div className="text-center space-y-6 pt-4 px-2">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    Hai, aku{" "}
                    <strong className="text-[#0D5C46]">GlucoAssistant</strong>,
                    asisten AI untuk konsultasi kadar gula darah & penyakit
                    gula. Aku bisa merekomendasikan obat, alat cek digital,
                    analisis foto makanan, serta menyambungkanmu ke{" "}
                    <strong>Dokter Spesialis Sp.PD</strong>.
                  </p>
                  <p className="text-sm text-gray-600 font-normal">
                    Mau mulai? Tanya saja atau pilih topik berikut.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Berapa kadar gula darah puasa yang tergolong aman?",
                      )
                    }
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
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#E07A5F] flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      📸 Analisis / bandingkan foto makanan
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Luka diabetes saya lambat sembuh, mau konsul ke Dokter Spesialis.",
                      )
                    }
                    className="w-full flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[#E07A5F] p-3.5 rounded-2xl text-left shadow-2xs hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <Syringe className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 group-hover:text-[#E07A5F]">
                      Luka diabetes saya lambat sembuh, butuh Dokter Spesialis.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`space-y-3 ${
                  msg.sender === "user"
                    ? "flex flex-col items-end"
                    : "flex flex-col items-start"
                }`}
              >
                {msg.sender === "user" && msg.images && msg.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap max-w-[88%] justify-end">
                    {msg.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Uploaded ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border-2 border-[#0D5C46]/30 shadow-sm"
                      />
                    ))}
                  </div>
                )}

                {msg.text && (
                  <div
                    className={`max-w-[88%] text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#0D5C46] text-white px-4 py-3 rounded-2xl rounded-tr-xs"
                        : "text-gray-800 font-normal pr-4"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                )}

                {msg.foodAnalyses &&
                  msg.foodAnalyses.map((fa, idx) =>
                    renderFoodCard(fa, idx, msg.foodAnalyses!.length),
                  )}

                {msg.comparison && (
                  <div className="w-full bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-[#E07A5F]/30 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                      <Scale className="w-4 h-4" />
                      <span>Perbandingan</span>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                        Pilihan Lebih Baik
                      </div>
                      <div className="text-sm font-bold text-[#0D5C46] mt-0.5">
                        {msg.comparison.better_choice}
                      </div>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed">
                      {msg.comparison.comparison_text}
                    </p>

                    <div className="bg-[#E07A5F] text-white rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">
                        💡 Rekomendasi
                      </div>
                      <p className="text-xs leading-relaxed">
                        {msg.comparison.recommendation}
                      </p>
                    </div>

                    {msg.comparison.suggested_questions?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {msg.comparison.suggested_questions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="w-full text-left text-[11px] bg-white hover:bg-gray-50 border border-gray-200 hover:border-[#E07A5F] px-3 py-2 rounded-lg text-gray-700 hover:text-[#E07A5F] transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{q}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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

                {/* 🔥 SUGGESTED QUESTIONS CHIPS (BARU) */}
                {msg.sender === "ai" && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="w-full space-y-2 pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wide">
                      <MessageCircle className="w-3 h-3" />
                      <span>Tanya lebih lanjut:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          disabled={isTyping || isAnalyzing}
                          className="text-[11px] bg-[#0D5C46]/5 hover:bg-[#0D5C46]/10 border border-[#0D5C46]/20 hover:border-[#0D5C46]/40 text-[#0D5C46] px-3 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[9px] text-gray-400 block px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500 py-1">
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-gray-400 ml-1">
                  GlucoAssistant menganalisis gejala...
                </span>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-gray-500 py-1">
                <Utensils className="w-4 h-4 text-[#E07A5F] animate-pulse" />
                <span className="text-xs text-gray-400">
                  Menganalisis foto makanan...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {selectedImages.length > 0 && (
            <div className="px-3 pt-3 bg-white border-t border-gray-100">
              <div className="flex items-start gap-2 flex-wrap">
                {selectedImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img}
                      alt={`Preview ${i + 1}`}
                      className="h-20 w-20 object-cover rounded-xl border-2 border-[#E07A5F] shadow-sm"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {selectedImages.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#E07A5F] flex flex-col items-center justify-center text-gray-400 hover:text-[#E07A5F] transition-colors cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] mt-1">Tambah</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleAnalyzeFood}
                disabled={isAnalyzing}
                className="mt-2 mb-1 inline-flex items-center gap-1.5 bg-[#0D5C46] hover:bg-[#1A8B6B] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5" />
                {isAnalyzing
                  ? "Menganalisis..."
                  : selectedImages.length > 1
                    ? `Bandingkan ${selectedImages.length} Makanan`
                    : "Analisis Makanan"}
              </button>
            </div>
          )}

          {totalCartItems > 0 && (
            <div className="bg-[#0D5C46] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg border-t border-emerald-900 animate-in slide-in-from-bottom-3">
              <div>
                <div className="text-xs font-bold">{totalCartItems} item terpilih</div>
                <div className="text-[11px] text-gray-200 font-medium">
                  Perkiraan harga{" "}
                  <strong className="text-white">{formatRupiah(totalCartPrice)}</strong>
                </div>
              </div>
              <button
                onClick={() => {
                  const items = Object.values(cart).map((item) => ({
                    id: item.rec.id,
                    name: item.rec.name,
                    unit: item.rec.unit,
                    price: item.rec.price,
                    image: item.rec.image,
                    qty: item.qty,
                  }));
                  localStorage.setItem("myskin_cart", JSON.stringify(items));
                  router.push("/checkout");
                }}
                className="bg-[#E07A5F] hover:bg-[#C9664B] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>Checkout</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="p-3 bg-white border-t border-gray-100 flex flex-col space-y-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isAnalyzing}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-600 disabled:text-gray-300 flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Upload foto makanan"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan atau upload foto makanan..."
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
            <div className="text-[9px] text-gray-400 pl-4">{input.length}/500</div>
          </div>
        </div>
      )}
    </>
  );
}