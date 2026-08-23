"use client";

import { useState } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import type {
  ChatFeedback,
  ChatFeedbackRating,
  ChatFeedbackReason,
} from "@/lib/api-types";

const REASONS: Array<{ value: ChatFeedbackReason; label: string }> = [
  { value: "IRRELEVANT", label: "Tidak relevan" },
  { value: "UNCLEAR", label: "Tidak jelas" },
  { value: "TOO_LONG", label: "Terlalu panjang" },
  { value: "INCORRECT", label: "Informasi salah" },
  { value: "OTHER", label: "Lainnya" },
];

interface ChatFeedbackControlsProps {
  value?: ChatFeedback;
  onSubmit: (
    rating: ChatFeedbackRating,
    reason?: ChatFeedbackReason,
  ) => Promise<void>;
}

export default function ChatFeedbackControls({ value, onSubmit }: ChatFeedbackControlsProps) {
  const [showReasons, setShowReasons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (rating: ChatFeedbackRating, reason?: ChatFeedbackReason) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(rating, reason);
      setShowReasons(false);
    } catch {
      setError("Penilaian belum berhasil disimpan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (value) {
    return (
      <p className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" /> Terima kasih atas penilaian Anda
      </p>
    );
  }

  return (
    <div className="space-y-1.5" aria-label="Penilaian jawaban GlucoAssistant">
      <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
        <span>Jawaban ini membantu?</span>
        <button
          type="button"
          aria-label="Jawaban membantu"
          disabled={isSubmitting}
          onClick={() => void submit("HELPFUL")}
          className="cursor-pointer rounded-md p-1 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Jawaban tidak membantu"
          disabled={isSubmitting}
          onClick={() => setShowReasons((current) => !current)}
          className="cursor-pointer rounded-md p-1 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {showReasons && (
        <div className="flex max-w-[290px] flex-wrap gap-1">
          {REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              disabled={isSubmitting}
              onClick={() => void submit("NOT_HELPFUL", reason.value)}
              className="cursor-pointer rounded-full border border-gray-200 bg-white px-2 py-1 text-[9px] font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reason.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-[9px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
