"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Search,
  UserRound,
} from "lucide-react";
import { ApiError, apiFetcher, apiRequest } from "@/lib/api-client";
import type {
  AdminChatDetail,
  AdminChatSession,
  AdminChatStats,
  ApiResponse,
  ChatSessionStatus,
  LeadQualificationStatus,
  PaginationMeta,
} from "@/lib/api-types";

type ListResponse = ApiResponse<AdminChatSession[]> & { meta: PaginationMeta };

const STATUS_LABELS: Record<ChatSessionStatus, string> = {
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  ABANDONED: "Ditinggalkan",
};

const QUALIFICATION_LABELS: Record<LeadQualificationStatus, string> = {
  ELIGIBLE: "Layak ditindaklanjuti",
  NEEDS_REVIEW: "Perlu ditinjau",
  NOT_ELIGIBLE: "Tidak layak",
};

export default function AdminChatPage() {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [emergency, setEmergency] = useState("");
  const [leadCaptured, setLeadCaptured] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (emergency) params.set("emergency", emergency);
    if (leadCaptured) params.set("leadCaptured", leadCaptured);
    return params.toString();
  }, [emergency, leadCaptured, page, search, status]);

  const {
    data: listResponse,
    error: listError,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR<ListResponse>(`/api/admin/chat/sessions?${query}`, apiFetcher, {
    revalidateOnFocus: false,
  });
  const { data: statsResponse, mutate: mutateStats } = useSWR<ApiResponse<AdminChatStats>>(
    "/api/admin/chat/stats",
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const {
    data: detailResponse,
    error: detailError,
    isLoading: detailLoading,
    mutate: mutateDetail,
  } = useSWR<ApiResponse<AdminChatDetail>>(
    selectedId ? `/api/admin/chat/sessions/${selectedId}` : null,
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const sessions = listResponse?.data ?? [];
  const meta = listResponse?.meta;
  const detail = detailResponse?.data;
  const stats = statsResponse?.data;

  const updateSession = async (input: {
    status?: ChatSessionStatus;
    qualificationStatus?: LeadQualificationStatus | null;
  }) => {
    if (!selectedId) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const response = await apiRequest<ApiResponse<AdminChatDetail>>(
        `/api/admin/chat/sessions/${selectedId}`,
        { method: "PATCH", body: input },
      );
      await Promise.all([
        mutateDetail(response, { revalidate: false }),
        mutateList(),
        mutateStats(),
      ]);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Perubahan gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">Chat & Lead</h1>
        <p className="mt-1 text-sm text-[#6B7C72]">
          Tinjau percakapan chatbot, kondisi darurat, dan data calon pasien.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats?.total} />
        <StatCard label="Aktif" value={stats?.active} />
        <StatCard label="Selesai" value={stats?.completed} />
        <StatCard label="Lead Lengkap" value={stats?.captured} />
        <StatCard label="Darurat" value={stats?.emergency} tone="danger" />
        <StatCard label="Perlu Review" value={stats?.needsReview} tone="warning" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchDraft.trim());
        }}
        className="grid gap-3 rounded-2xl border border-[#EAE4DC] bg-white p-4 md:grid-cols-[1fr_repeat(3,minmax(0,160px))]"
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#EAE4DC] px-3">
          <Search className="h-4 w-4 text-[#8A978F]" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Cari nama, WhatsApp, atau isi chat"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            className="cursor-pointer text-xs font-bold text-[#0D5C46] hover:underline"
          >
            Cari
          </button>
        </div>
        <FilterSelect
          label="Semua status"
          value={status}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={[
            ["ACTIVE", "Aktif"],
            ["COMPLETED", "Selesai"],
            ["ABANDONED", "Ditinggalkan"],
          ]}
        />
        <FilterSelect
          label="Semua kondisi"
          value={emergency}
          onChange={(value) => {
            setPage(1);
            setEmergency(value);
          }}
          options={[["true", "Darurat"], ["false", "Tidak darurat"]]}
        />
        <FilterSelect
          label="Semua lead"
          value={leadCaptured}
          onChange={(value) => {
            setPage(1);
            setLeadCaptured(value);
          }}
          options={[["true", "Lead lengkap"], ["false", "Belum lengkap"]]}
        />
      </form>

      {(listError || actionError) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {actionError ?? listError?.message}
        </p>
      )}

      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white lg:grid-cols-[360px_1fr]">
        <section className="border-b border-[#EAE4DC] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#EAE4DC] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#6B7C72]">
            {meta ? `${meta.total} session` : "Session chatbot"}
          </div>
          <div className="max-h-[620px] divide-y divide-[#F2ECE4] overflow-y-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setActionError(null);
                  setSelectedId(session.id);
                }}
                className={`w-full cursor-pointer p-4 text-left transition-colors ${
                  selectedId === session.id ? "bg-[#0D5C46]/5" : "hover:bg-[#FAF8F5]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1A2421]">
                      {session.lead?.name || "Pengunjung anonim"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#6B7C72]">
                      {session.lead?.whatsapp || `${session.messageCount} pesan`}
                    </p>
                  </div>
                  {session.isEmergency && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={session.status} />
                  <time className="text-[10px] text-[#8A978F]">{formatDate(session.updatedAt)}</time>
                </div>
              </button>
            ))}
            {listLoading && <p className="p-8 text-center text-sm text-[#6B7C72]">Memuat session...</p>}
            {!listLoading && sessions.length === 0 && (
              <p className="p-8 text-center text-sm text-[#6B7C72]">Tidak ada session sesuai filter.</p>
            )}
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#EAE4DC] p-3">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="cursor-pointer rounded-lg p-2 text-[#0D5C46] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-[#6B7C72]">{page} / {meta.totalPages}</span>
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="cursor-pointer rounded-lg p-2 text-[#0D5C46] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <section className="min-w-0">
          {!selectedId && (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center text-[#6B7C72]">
              <MessageSquareText className="mb-3 h-9 w-9 text-[#0D5C46]/40" />
              <p className="text-sm font-semibold">Pilih session untuk melihat histori dan data lead.</p>
            </div>
          )}
          {selectedId && detailLoading && (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6B7C72]">Memuat detail...</div>
          )}
          {selectedId && detailError && (
            <p className="m-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">{detailError.message}</p>
          )}
          {detail && (
            <div className="flex h-full max-h-[720px] flex-col">
              <div className="space-y-4 border-b border-[#EAE4DC] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-[#0D5C46]" />
                      <h2 className="font-bold text-[#1A2421]">{detail.lead?.name || "Pengunjung anonim"}</h2>
                      {detail.isEmergency && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">DARURAT</span>}
                    </div>
                    <p className="mt-1 text-xs text-[#6B7C72]">Dibuat {formatDate(detail.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      aria-label="Status session"
                      value={detail.status}
                      disabled={isSaving}
                      onChange={(event) => void updateSession({ status: event.target.value as ChatSessionStatus })}
                      className="rounded-xl border border-[#EAE4DC] bg-white px-3 py-2 text-xs font-semibold text-[#3A4F46] outline-none"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <select
                      aria-label="Kualifikasi lead"
                      value={detail.lead?.qualificationStatus ?? ""}
                      disabled={isSaving}
                      onChange={(event) => void updateSession({ qualificationStatus: (event.target.value || null) as LeadQualificationStatus | null })}
                      className="rounded-xl border border-[#EAE4DC] bg-white px-3 py-2 text-xs font-semibold text-[#3A4F46] outline-none"
                    >
                      <option value="">Belum dikualifikasi</option>
                      {Object.entries(QUALIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl bg-[#FAF8F5] p-4 sm:grid-cols-2 xl:grid-cols-3">
                  <LeadField label="WhatsApp" value={detail.lead?.whatsapp} />
                  <LeadField label="Tipe Diabetes" value={detail.lead?.diabetesType} />
                  <LeadField label="Obat Saat Ini" value={detail.lead?.currentMedication} />
                  <div className="sm:col-span-2 xl:col-span-3">
                    <LeadField label="Keluhan Utama" value={detail.lead?.primaryComplaint} />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#FCFBF9] p-5">
                {detail.messages.map((message) => (
                  <div key={message.id} className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "USER" ? "rounded-tr-sm bg-[#0D5C46] text-white" : "rounded-tl-sm border border-[#EAE4DC] bg-white text-[#1A2421]"}`}>
                      <p className="whitespace-pre-line">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <p className="mt-2 border-t border-[#EAE4DC] pt-2 text-[10px] text-[#6B7C72]">
                          Sumber: {message.sources.map((source) => source.title).join(", ")}
                        </p>
                      )}
                      <time className={`mt-2 block text-[9px] ${message.role === "USER" ? "text-white/60" : "text-[#8A978F]"}`}>{formatDate(message.createdAt)}</time>
                    </div>
                  </div>
                ))}
                {detail.messageCount > detail.messages.length && (
                  <p className="text-center text-xs text-[#8A978F]">Menampilkan 200 pesan pertama dari {detail.messageCount} pesan.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value?: number; tone?: "default" | "danger" | "warning" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-700" : "text-[#0D5C46]";
  return (
    <div className="rounded-2xl border border-[#EAE4DC] bg-white p-4">
      <p className={`text-2xl font-extrabold ${toneClass}`}>{value ?? "…"}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7C72]">{label}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#EAE4DC] bg-white px-3 py-2.5 text-sm text-[#3A4F46] outline-none">
      <option value="">{label}</option>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  );
}

function StatusBadge({ status }: { status: ChatSessionStatus }) {
  const className = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : status === "COMPLETED" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${className}`}>{STATUS_LABELS[status]}</span>;
}

function LeadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A978F]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[#3A4F46]">{value || "Belum tersedia"}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
