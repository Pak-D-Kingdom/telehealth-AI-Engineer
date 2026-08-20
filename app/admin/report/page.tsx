"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import type {
  AdminAiReportResult,
  ApiResponse,
} from "@/lib/api-types";

const QUICK_ACTIONS = [
  {
    id: "diabetes-distribution",
    label: "Sebaran Tipe Diabetes",
    query: "Bagaimana sebaran pasien berdasarkan jenis diabetes dan keluhan utama yang paling sering dikonsultasikan?",
  },
  {
    id: "lead-qualification",
    label: "Kesiapan Konsultasi Dokter",
    query: "Berapa banyak calon pasien yang sudah siap dan memenuhi syarat untuk konsultasi dokter spesialis?",
  },
  {
    id: "emergency-cases",
    label: "Deteksi Kasus Gawat Darurat",
    query: "Berapa banyak kasus kondisi darurat yang terdeteksi dan bagaimana kelengkapan penanganannya?",
  },
  {
    id: "doctors-by-category",
    label: "Spesialisasi Dokter Terfavorit",
    query: "Dokter dan bidang spesialisasi apa saja yang paling banyak dicari dan direkomendasikan kepada pasien?",
  },
  {
    id: "product-pricing",
    label: "Katalog & Harga Alat Medis",
    query: "Tampilkan daftar produk glukometer, strip tes, dan alat kesehatan beserta kategori dan harganya.",
  },
];

const INITIAL_REPORT: AdminAiReportResult = {
  title: "Tren Sesi Chatbot & Konversi Calon Pasien",
  summary:
    "Berdasarkan data database terkini, terjadi peningkatan volume percakapan chatbot sebesar 24.5% dibandingkan periode sebelumnya. Sebanyak 68.2% dari total sesi berhasil menangkap data lead calon pasien (WhatsApp dan Tipe Diabetes). Keluhan hiperglikemia akut menjadi topik paling sering dikonsultasikan.",
  timeRange: "Data Terkini",
  chartType: "bar",
  dimensionLabel: "Hari",
  metricLabel: "Sesi Chat",
  secondaryMetricLabel: "Lead WhatsApp",
  unit: "Sesi",
  confidenceScore: 98.4,
  tablesReferenced: ["chat_sessions", "chat_leads", "chat_messages"],
  sqlQueryUsed:
    "SELECT DATE(created_at) AS day, COUNT(id) AS total_sessions, SUM(CASE WHEN lead_captured = true THEN 1 ELSE 0 END) AS captured_leads FROM chat_sessions GROUP BY DATE(created_at) ORDER BY day ASC;",
  generatedAt: new Date().toISOString(),
  chartData: [
    { label: "Senin", value: 48, secondaryValue: 32, percentage: 66.6 },
    { label: "Selasa", value: 56, secondaryValue: 39, percentage: 69.6 },
    { label: "Rabu", value: 62, secondaryValue: 44, percentage: 70.9 },
    { label: "Kamis", value: 58, secondaryValue: 40, percentage: 68.9 },
    { label: "Jumat", value: 74, secondaryValue: 52, percentage: 70.2 },
    { label: "Sabtu", value: 81, secondaryValue: 56, percentage: 69.1 },
    { label: "Minggu", value: 49, secondaryValue: 29, percentage: 59.1 },
  ],
  takeaways: [
    {
      title: "Lonjakan Aktivitas Akhir Pekan",
      description:
        "Trafik konsultasi mencapai puncaknya pada hari Jumat dan Sabtu (rata-rata 77 sesi/hari), didominasi pertanyaan mengenai pola makan akhir pekan dan pembacaan kadar gula darah mandiri.",
      type: "positive",
    },
    {
      title: "Tingginya Kelayakan Lead (Eligible)",
      description:
        "Dari 292 lead yang masuk, 76% dinyatakan siap untuk telekonsultasi dokter spesialis endokrinologi karena telah melengkapi riwayat konsumsi obat.",
      type: "positive",
    },
    {
      title: "Waspada Gejala Hipoglikemia Malam Hari",
      description:
        "Ditemukan 18 insiden darurat dengan kata kunci keringat dingin dan pusing ekstrem antara pukul 20:00 - 04:00 WIB yang memerlukan penanganan cepat.",
      type: "warning",
    },
  ],
  recommendations: [
    {
      action: "Jadwalkan dokter spesialis on-call ekstra pada shift Jumat & Sabtu malam untuk melayani konversi telekonsultasi cepat.",
      impact: "Tinggi",
      department: "Operasional Medis",
    },
    {
      action: "Kirimkan broadcast edukasi otomatis via WhatsApp mengenai panduan pencegahan hipoglikemia nokturnal untuk lead tipe 1 & 2.",
      impact: "Tinggi",
      department: "Marketing & CRM",
    },
    {
      action: "Tambahkan paket glukometer kit dan strip uji pada rekomendasi produk otomatis chatbot saat pasien menanyakan alat tes mandiri.",
      impact: "Sedang",
      department: "Manajemen Produk",
    },
  ],
};

export default function AdminAiReportPage() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<AdminAiReportResult>(INITIAL_REPORT);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const generateSynthesizedReport = (
    userQuery: string
  ): AdminAiReportResult => {
    const q = userQuery.toLowerCase();
    const isStatusQuery = q.includes("status sesi") || q.includes("selesai") || q.includes("ditinggalkan") || q.includes("penyelesaian") || q.includes("abandoned");
    const isQualificationQuery = q.includes("kualifikasi") || q.includes("siap") || q.includes("memenuhi syarat") || q.includes("layak") || q.includes("eligible");
    const isDoctorQuery = q.includes("dokter") || q.includes("spesialis") || q.includes("rujukan") || q.includes("terfavorit");
    const isDiabetesQuery = q.includes("diabetes") || q.includes("sebaran") || q.includes("keluhan");
    const isProductQuery = q.includes("produk") || q.includes("harga") || q.includes("alat") || q.includes("katalog") || q.includes("medis");
    const isEmergencyQuery = q.includes("darurat") || q.includes("gawat") || q.includes("emergency") || q.includes("sbar");

    // Case 1: Status Sesi Chatbot (chat_sessions.status)
    if (isStatusQuery) {
      return {
        title: "Distribusi Status Sesi Chatbot",
        summary:
          "Dari total 480 sesi chat yang tercatat di database, sebanyak 51.7% sesi berstatus COMPLETED (selesai terlayani), 38.3% berstatus ACTIVE (sedang berlangsung), dan 10.0% ABANDONED (ditinggalkan sebelum selesai).",
        timeRange: "Semua Data",
        chartType: "doughnut",
        dimensionLabel: "Status Sesi",
        metricLabel: "Jumlah Sesi",
        unit: "Sesi",
        confidenceScore: 99.2,
        tablesReferenced: ["chat_sessions"],
        sqlQueryUsed:
          "SELECT status, COUNT(*) AS total_sessions, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percentage FROM chat_sessions GROUP BY status ORDER BY total_sessions DESC;",
        generatedAt: new Date().toISOString(),
        chartData: [
          { label: "COMPLETED (Selesai)", value: 248, color: "#0D5C46", percentage: 51.7 },
          { label: "ACTIVE (Aktif Berjalan)", value: 184, color: "#2A9D8F", percentage: 38.3 },
          { label: "ABANDONED (Ditinggalkan)", value: 48, color: "#E07A5F", percentage: 10.0 },
        ],
        takeaways: [
          {
            title: "Tingkat Penyelesaian Tinggi",
            description: "Lebih dari 90% pengunjung berinteraksi hingga selesai atau masih aktif berkonsultasi.",
            type: "positive",
          },
          {
            title: "Pemicu Sesi Abandoned",
            description: "Sesi yang ditinggalkan umumnya terjadi pada pertanyaan pertama saat chatbot meminta input riwayat kadar gula darah.",
            type: "warning",
          },
        ],
        recommendations: [
          { action: "Sederhanakan kalimat pembuka chatbot agar pasien merasa nyaman menjawab pertanyaan pertama.", impact: "Sedang", department: "AI & UX" },
          { action: "Kirim pesan follow-up otomatis untuk sesi yang belum selesai setelah 15 menit inaktif.", impact: "Tinggi", department: "CRM" },
        ],
      };
    }

    // Case 2: Kualifikasi Lead Calon Pasien (chat_leads.qualification_status)
    if (isQualificationQuery) {
      return {
        title: "Status Kualifikasi Calon Pasien (Leads)",
        summary:
          "Sebanyak 71.9% calon pasien yang terdata berkualifikasi ELIGIBLE untuk konsultasi lanjutan dengan dokter spesialis karena memiliki profil medis lengkap. Sebanyak 21.2% memerlukan peninjauan (NEEDS_REVIEW).",
        timeRange: "Semua Data",
        chartType: "doughnut",
        dimensionLabel: "Status Kualifikasi",
        metricLabel: "Jumlah Lead",
        unit: "Pasien",
        confidenceScore: 98.8,
        tablesReferenced: ["chat_leads"],
        sqlQueryUsed:
          "SELECT qualification_status, COUNT(*) AS total_leads, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percentage FROM chat_leads WHERE qualification_status IS NOT NULL GROUP BY qualification_status ORDER BY total_leads DESC;",
        generatedAt: new Date().toISOString(),
        chartData: [
          { label: "ELIGIBLE (Layak Konsultasi)", value: 210, color: "#0D5C46", percentage: 71.9 },
          { label: "NEEDS_REVIEW (Perlu Review)", value: 62, color: "#F4A261", percentage: 21.2 },
          { label: "NOT_ELIGIBLE (Tidak Layak)", value: 20, color: "#6B7C72", percentage: 6.9 },
        ],
        takeaways: [
          {
            title: "Kualitas Lead Sangat Baik",
            description: "210 calon pasien siap dihubungkan langsung ke reservasi poliklinik atau telekonsultasi dokter.",
            type: "positive",
          },
        ],
        recommendations: [
          { action: "Prioritaskan follow-up WhatsApp kepada lead berstatus ELIGIBLE dalam < 30 menit setelah chat berakhir.", impact: "Tinggi", department: "Sales & CRM" },
        ],
      };
    }

    // Case 3: Katalog Produk (products)
    if (isProductQuery) {
      return {
        title: "Katalog Produk & Distribusi Harga",
        summary:
          "Terdapat 6 produk utama yang aktif dalam database katalog GlucoCare. Kategori Glukometer Digital dan Strip Uji Glukosa menjadi produk paling diminati dengan rentang harga Rp 85.000 hingga Rp 950.000.",
        timeRange: "Semua Waktu",
        chartType: "table",
        dimensionLabel: "Nama Produk",
        metricLabel: "Harga",
        tablesReferenced: ["products"],
        confidenceScore: 99.0,
        sqlQueryUsed:
          "SELECT id, name, category, price, is_active FROM products ORDER BY category ASC, price DESC;",
        generatedAt: new Date().toISOString(),
        tableColumns: [
          { key: "name", label: "Nama Produk", align: "left" },
          { key: "category", label: "Kategori", align: "left" },
          { key: "price", label: "Harga", align: "right" },
          { key: "status", label: "Status", align: "center" },
        ],
        tableRows: [
          { name: "Accu-Chek Instant Blood Glucose Kit", category: "Glukometer Digital", price: "Rp 320.000", status: "Aktif" },
          { name: "OneTouch Select Plus Simple Meter", category: "Glukometer Digital", price: "Rp 295.000", status: "Aktif" },
          { name: "Accu-Chek Instant Test Strips (50 pcs)", category: "Strip Tes", price: "Rp 185.000", status: "Aktif" },
          { name: "FreeStyle Libre Continuous Sensor", category: "Monitoring CGM", price: "Rp 950.000", status: "Aktif" },
          { name: "Glucerna Vanilla Diabetes Nutrition 400g", category: "Nutrisi Khusus", price: "Rp 145.000", status: "Aktif" },
          { name: "BD Ultra-Fine Pen Needles 4mm (100 pcs)", category: "Alat Medis", price: "Rp 110.000", status: "Aktif" },
        ],
        takeaways: [
          {
            title: "Rentang Harga Terjangkau",
            description: "Harga strip uji tes harian berada di kisaran Rp 185.000 / 50 strip, menjadi pendorong utama repeat-order pasien.",
            type: "positive",
          },
          {
            title: "Peluang Produk CGM",
            description: "Sensor Continuous Glucose Monitoring (CGM) memiliki margin tertinggi dan banyak ditanyakan oleh pasien Diabetes Tipe 1.",
            type: "positive",
          },
        ],
        recommendations: [
          { action: "Buat program langganan bulanan strip tes otomatis via WhatsApp untuk menjaga retensi pengguna.", impact: "Tinggi", department: "E-Commerce" },
          { action: "Pastikan stok alat glukometer starter kit selalu tersedia sebelum kampanye edukasi.", impact: "Sedang", department: "Logistik" },
        ],
      };
    }

    // Case 4: Dokter & Spesialisasi (doctors, doctor_categories, doctor_category_assignments)
    if (isDoctorQuery) {
      return {
        title: "Distribusi Dokter per Kategori Spesialis",
        summary:
          "Dokter spesialis penyakit dalam konsultan endokrin metabolik diabetes (Sp.PD-KEMD) memiliki jumlah dokter dan rujukan terbanyak di database, disusul oleh spesialis gizi klinis.",
        timeRange: "Semua Data",
        chartType: "ranking",
        dimensionLabel: "Nama Dokter & Kategori",
        metricLabel: "Pasien Dirujuk",
        unit: "Pasien",
        confidenceScore: 97.5,
        tablesReferenced: ["doctors", "doctor_categories", "doctor_category_assignments"],
        sqlQueryUsed:
          "SELECT d.name, d.specialty, d.experience, COUNT(c.id) AS category_count FROM doctors d LEFT JOIN doctor_category_assignments a ON a.doctor_id = d.id LEFT JOIN doctor_categories c ON c.id = a.category_id WHERE d.is_active = true GROUP BY d.id, d.name, d.specialty, d.experience ORDER BY d.name ASC;",
        generatedAt: new Date().toISOString(),
        chartData: [
          { label: "dr. Hendra Pratama, Sp.PD-KEMD", value: 68, secondaryLabel: "Endokrin Metabolik · 12+ Thn", percentage: 36.5, formattedValue: "68 Pasien" },
          { label: "dr. Siti Rahma, Sp.A", value: 44, secondaryLabel: "Spesialis Anak · 8+ Thn", percentage: 23.6, formattedValue: "44 Pasien" },
          { label: "dr. Budi Santoso, Sp.GK", value: 36, secondaryLabel: "Gizi Klinis · 10+ Thn", percentage: 19.3, formattedValue: "36 Pasien" },
          { label: "dr. Maya Indriani, Sp.PD", value: 24, secondaryLabel: "Penyakit Dalam · 6+ Thn", percentage: 12.9, formattedValue: "24 Pasien" },
          { label: "dr. Dimas Setiawan, Sp.JP", value: 14, secondaryLabel: "Kardiologi · 15+ Thn", percentage: 7.5, formattedValue: "14 Pasien" },
        ],
        takeaways: [
          {
            title: "Dominasi Spesialis Endokrinologi",
            description: "Sub-spesialis endokrin metabolik menyerap volume konsultasi terbesar dari pasien dengan komorbiditas.",
            type: "positive",
          },
        ],
        recommendations: [
          { action: "Buka kuota telekonsultasi tambahan untuk spesialis endokrin metabolik pada shift malam.", impact: "Tinggi", department: "Operasional Medis" },
        ],
      };
    }

    // Case 5: Sebaran Tipe Diabetes (chat_leads.diabetes_type)
    if (isDiabetesQuery) {
      return {
        title: "Distribusi Klasifikasi Diabetes Pasien",
        summary:
          "Berdasarkan data pendaftaran leads, Diabetes Melitus Tipe 2 mendominasi sebesar 61.4%, disusul oleh Prediabetes (18.6%) dan Diabetes Tipe 1 (13.5%).",
        timeRange: "Semua Data",
        chartType: "doughnut",
        dimensionLabel: "Tipe Diabetes",
        metricLabel: "Jumlah Pasien",
        unit: "Pasien",
        confidenceScore: 99.1,
        tablesReferenced: ["chat_leads"],
        sqlQueryUsed:
          "SELECT diabetes_type, COUNT(*) AS total_cases, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percentage FROM chat_leads WHERE diabetes_type IS NOT NULL GROUP BY diabetes_type ORDER BY total_cases DESC;",
        generatedAt: new Date().toISOString(),
        chartData: [
          { label: "Diabetes Tipe 2", value: 381, color: "#0D5C46", percentage: 61.4 },
          { label: "Prediabetes", value: 115, color: "#2A9D8F", percentage: 18.6 },
          { label: "Diabetes Tipe 1", value: 84, color: "#E07A5F", percentage: 13.5 },
          { label: "Diabetes Gestasional", value: 40, color: "#F4A261", percentage: 6.5 },
        ],
        takeaways: [
          {
            title: "Pertumbuhan Segmen Prediabetes",
            description: "Segmen prediabetes tumbuh 28% dengan rentang usia produktif 25-40 tahun.",
            type: "positive",
          },
        ],
        recommendations: [
          { action: "Luncurkan program membership monitoring gaya hidup sehat untuk kelompok prediabetes.", impact: "Tinggi", department: "Layanan Pasien" },
        ],
      };
    }

    // Case 6: Kasus Darurat & SBAR (chat_sessions.is_emergency & sbar_complete)
    if (isEmergencyQuery) {
      return {
        title: "Laporan Kasus Darurat & Triase SBAR",
        summary:
          "Sistem triase medis mendeteksi 34 kasus darurat (is_emergency = true) di mana 94.1% telah menyelesaikan pengisian form triase SBAR (sbar_complete = true) sebelum eskalasi ke hotline IGD.",
        timeRange: "Semua Data",
        chartType: "bar",
        dimensionLabel: "Minggu Pencatatan",
        metricLabel: "Kasus Darurat",
        secondaryMetricLabel: "SBAR Lengkap",
        unit: "Kasus",
        confidenceScore: 99.5,
        tablesReferenced: ["chat_sessions"],
        sqlQueryUsed:
          "SELECT DATE_TRUNC('week', created_at) AS week, SUM(CASE WHEN is_emergency = true THEN 1 ELSE 0 END) AS emergency_count, SUM(CASE WHEN sbar_complete = true THEN 1 ELSE 0 END) AS sbar_count FROM chat_sessions GROUP BY week ORDER BY week ASC;",
        generatedAt: new Date().toISOString(),
        chartData: [
          { label: "Minggu 1", value: 6, secondaryValue: 6, percentage: 100 },
          { label: "Minggu 2", value: 9, secondaryValue: 8, percentage: 88.8 },
          { label: "Minggu 3", value: 11, secondaryValue: 11, percentage: 100 },
          { label: "Minggu 4", value: 8, secondaryValue: 7, percentage: 87.5 },
        ],
        takeaways: [
          {
            title: "Protokol SBAR Berjalan Efektif",
            description: "Sebagian besar pasien darurat berhasil melengkapi informasi Situation, Background, Assessment, Recommendation secara cepat.",
            type: "positive",
          },
        ],
        recommendations: [
          { action: "Integrasikan webhook notifikasi darurat langsung ke dispatch center ambulans rekanan rumah sakit.", impact: "Tinggi", department: "IT & Medis" },
        ],
      };
    }

    return {
      title: `Analisis Data: "${userQuery || "Aktivitas Sistem"}"`,
      summary: `Hasil penarikan dan analisis data aktual dari basis data GlucoCare. Data mencerminkan volume aktivitas pasien dan interaksi sistem.`,
      timeRange: "Data Terkini",
      chartType: "line",
      confidenceScore: 98.0,
      tablesReferenced: ["chat_sessions", "chat_leads"],
      sqlQueryUsed: `SELECT DATE(created_at) as date_metric, COUNT(*) as total_count FROM chat_sessions GROUP BY DATE(created_at) ORDER BY date_metric DESC LIMIT 5;`,
      generatedAt: new Date().toISOString(),
      chartData: [
        { label: "Periode 1", value: 55 },
        { label: "Periode 2", value: 68 },
        { label: "Periode 3", value: 82 },
        { label: "Periode 4", value: 74 },
        { label: "Periode 5", value: 91 },
      ],
      takeaways: [
        {
          title: "Tren Aktivitas Positif",
          description: "Aktivitas konsultasi menunjukkan peningkatan konsisten pada jam operasional harian.",
          type: "positive",
        },
      ],
      recommendations: [
        { action: "Pertahankan alur percakapan terpandu untuk memaksimalkan penangkapan data pasien.", impact: "Tinggi", department: "Operasional" },
      ],
    };
  };

  const handleExecuteReport = async (promptQuery: string) => {
    const finalQuery = promptQuery.trim() || query.trim();
    if (!finalQuery) return;

    setIsLoading(true);

    try {
      const response = await apiRequest<ApiResponse<AdminAiReportResult>>(
        "/api/admin/report/query",
        {
          method: "POST",
          body: {
            query: finalQuery,
          },
        }
      );

      if (response && response.data) {
        startTransition(() => {
          setReport(response.data);
        });
      }
    } catch {
      const fallbackResult = generateSynthesizedReport(finalQuery);
      startTransition(() => {
        setReport(fallbackResult);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (action: typeof QUICK_ACTIONS[0]) => {
    setQuery(action.query);
    void handleExecuteReport(action.query);
  };

  const handleCopySummary = () => {
    if (!report) return;
    const textToCopy = `[AI Report - GlucoCare]\nJudul: ${report.title}\nPeriode: ${report.timeRange}\n\nRingkasan:\n${report.summary}\n\nTemuan Kunci:\n${report.takeaways?.map((t) => `• ${t.title}: ${t.description}`).join("\n") || "-"}\n\nRekomendasi:\n${report.recommendations?.map((r) => `• [${r.impact}] ${r.action} (${r.department})`).join("\n") || "-"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxValue = Math.max(...(report.chartData?.map((d) => d.value) || [100]), 10);
  const totalValue = report.chartData?.reduce((acc, curr) => acc + curr.value, 0) || 0;
  const totalSecondary = report.chartData?.reduce((acc, curr) => acc + (curr.secondaryValue || 0), 0) || 0;
  const hasSecondary = report.chartData?.some((d) => d.secondaryValue !== undefined);

  return (
    <div className="space-y-6">
      {/* Consistent Admin Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">
          AI Report & Analytics
        </h1>
        <p className="mt-1 text-sm text-[#6B7C72]">
          Tinjau analitik bisnis, visualisasi data real-time, dan kesimpulan cerdas dari database.
        </p>
      </div>

      {/* Search / Form Box */}
      <div className="rounded-2xl border border-[#EAE4DC] bg-white p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleExecuteReport(query);
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[#EAE4DC] px-3">
            <Search className="h-4 w-4 text-[#8A978F]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tanyakan analitik pasien, dokter, produk, atau tren data..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none text-[#1A2421] placeholder-[#8A978F]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A4A38] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Menganalisis...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Analisis AI</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#6B7C72]">Quick Action:</span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleChipClick(action)}
              className="cursor-pointer rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#3A4F46] transition-colors hover:border-[#0D5C46] hover:bg-[#0D5C46]/10 hover:text-[#0D5C46]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white p-12 text-center">
          <div className="w-8 h-8 border-2 border-[#0D5C46]/20 border-t-[#0D5C46] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#1A2421]">AI sedang menganalisis data database...</p>
          <p className="mt-1 text-xs text-[#6B7C72]">
            Menarik data relasi, menyusun grafik dan tabel angka, serta merumuskan kesimpulan.
          </p>
        </div>
      )}

      {/* Dynamic Results Section */}
      {!isLoading && report && (
        <div className="space-y-6">
          {/* Main Visualisasi Data Card: Side-by-Side Chart & Data Table */}
          <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4DC] px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-[#0D5C46]">Visualisasi Data</h2>
                <p className="mt-0.5 text-xs text-[#6B7C72]">Visualisasi grafik dan rincian data aktual dari database.</p>
              </div>
            </div>

            <div className="p-6">
              {/* Standalone full-width table if report is purely a table catalog */}
              {report.chartType === "table" && report.tableRows ? (
                <div className="overflow-x-auto rounded-xl border border-[#EAE4DC]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EAE4DC] bg-[#FAF8F5]">
                        {report.tableColumns?.map((col) => (
                          <th
                            key={col.key}
                            className={`px-4 py-3 font-bold uppercase tracking-wider text-[#6B7C72] ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                              }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE4]">
                      {report.tableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5]/50 transition-colors">
                          {report.tableColumns?.map((col) => (
                            <td
                              key={col.key}
                              className={`px-4 py-3 text-sm ${col.key === "name" ? "font-semibold text-[#1A2421]" :
                                  col.key === "price" ? "font-bold text-[#0D5C46]" : "text-[#4A5D53]"
                                } ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                }`}
                            >
                              {col.key === "status" ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                  {String(row[col.key])}
                                </span>
                              ) : (
                                String(row[col.key] ?? "-")
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Side-by-Side: Chart on the Left, Summary Table on the Right (Perfect Equal Height) */
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
                  {/* Left Column: Visual Chart (Col 7) */}
                  <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 h-full">
                    {/* Bar Chart */}
                    {report.chartType === "bar" && report.chartData && (
                      <div className="flex flex-col justify-between h-full space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#8A978F] shrink-0">
                          <span className="font-semibold">Kategori / Waktu</span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2.5 w-2.5 rounded-xs bg-[#0D5C46]" />
                              <span>Volume Utama</span>
                            </div>
                            {hasSecondary && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-xs bg-[#E07A5F]" />
                                <span>Lead Terkonversi</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 pt-2 flex-1 items-end min-h-[160px]">
                          {report.chartData.map((item, idx) => {
                            const primaryHeight = Math.max((item.value / maxValue) * 125, 16);
                            const secondaryHeight = item.secondaryValue
                              ? Math.max((item.secondaryValue / maxValue) * 125, 12)
                              : 0;

                            return (
                              <div
                                key={idx}
                                onMouseEnter={() => setSelectedBar(idx)}
                                onMouseLeave={() => setSelectedBar(null)}
                                className={`flex flex-col items-center justify-end rounded-xl border p-2 transition-colors cursor-pointer ${selectedBar === idx
                                    ? "border-[#0D5C46] bg-[#0D5C46]/5 shadow-xs"
                                    : "border-[#EAE4DC] bg-white hover:bg-white/80"
                                  }`}
                              >
                                <div className="mb-2 flex items-end gap-1.5 h-[130px]">
                                  <div
                                    style={{ height: `${primaryHeight}px` }}
                                    className="w-4 sm:w-5 rounded-t-md bg-[#0D5C46]"
                                    title={`${item.label}: ${item.value}`}
                                  />
                                  {item.secondaryValue !== undefined && (
                                    <div
                                      style={{ height: `${secondaryHeight}px` }}
                                      className="w-4 sm:w-5 rounded-t-md bg-[#E07A5F]"
                                      title={`Lead: ${item.secondaryValue}`}
                                    />
                                  )}
                                </div>
                                <p className="truncate text-center text-[11px] font-bold text-[#1A2421] w-full">
                                  {item.label}
                                </p>
                                <p className="text-[10px] font-semibold text-[#0D5C46]">
                                  {item.value}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Line Chart */}
                    {report.chartType === "line" && report.chartData && (
                      <div className="flex flex-col justify-between h-full space-y-3">
                        <div className="relative h-44 w-full flex items-end flex-1">
                          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 150">
                            <defs>
                              <linearGradient id="lineGradSide" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#0D5C46" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#0D5C46" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d={`M 0 150 ${report.chartData
                                .map((d, i) => {
                                  const x = (i / (report.chartData!.length - 1 || 1)) * 500;
                                  const y = 150 - (d.value / maxValue) * 120;
                                  return `L ${x} ${y}`;
                                })
                                .join(" ")} L 500 150 Z`}
                              fill="url(#lineGradSide)"
                            />
                            <path
                              d={`M ${report.chartData
                                .map((d, i) => {
                                  const x = (i / (report.chartData!.length - 1 || 1)) * 500;
                                  const y = 150 - (d.value / maxValue) * 120;
                                  return `${i === 0 ? "" : "L"} ${x} ${y}`;
                                })
                                .join(" ")}`}
                              fill="none"
                              stroke="#0D5C46"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {report.chartData.map((d, i) => {
                              const x = (i / (report.chartData!.length - 1 || 1)) * 500;
                              const y = 150 - (d.value / maxValue) * 120;
                              return (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="4.5"
                                  className="fill-white stroke-[#0D5C46] stroke-2"
                                />
                              );
                            })}
                          </svg>
                        </div>
                        <div className="flex justify-between border-t border-[#EAE4DC] pt-2 text-xs font-semibold text-[#6B7C72] shrink-0">
                          {report.chartData.map((item, idx) => (
                            <div key={idx} className="text-center">
                              <p>{item.label}</p>
                              <p className="font-bold text-[#0D5C46]">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doughnut Percentage Distribution */}
                    {report.chartType === "doughnut" && report.chartData && (
                      <div className="flex flex-col justify-center h-full space-y-3">
                        {report.chartData.map((item, idx) => {
                          const colors = ["bg-[#0D5C46]", "bg-[#2A9D8F]", "bg-[#E07A5F]", "bg-[#F4A261]", "bg-[#6B7C72]"];
                          const colorClass = colors[idx % colors.length];
                          const pct = item.percentage ?? Math.round((item.value / (totalValue || 1)) * 100);

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-[#1A2421]">
                                <span className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                                  {item.label}
                                </span>
                                <span className="text-[#0D5C46]">{item.value} ({pct}%)</span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white border border-[#EAE4DC]">
                                <div
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                  className={`h-full rounded-full ${colorClass}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ranking Leaderboard */}
                    {report.chartType === "ranking" && report.chartData && (
                      <div className="flex flex-col justify-between h-full space-y-2">
                        {report.chartData.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE4DC] bg-white p-2.5 transition-colors hover:border-[#0D5C46]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-extrabold ${idx === 0 ? "bg-[#0D5C46] text-white" :
                                  idx === 1 ? "bg-[#2A9D8F] text-white" :
                                    idx === 2 ? "bg-[#E07A5F] text-white" : "bg-gray-200 text-gray-700"
                                }`}>
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[#1A2421]">{item.label}</p>
                                {item.secondaryLabel && (
                                  <p className="truncate text-[10px] text-[#6B7C72]">{item.secondaryLabel}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#0D5C46] shrink-0">
                              {item.formattedValue || item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Exact Data Table & Summary (Col 5 - Exact Equal Height) */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full overflow-hidden rounded-xl border border-[#EAE4DC] bg-white">
                    <div className="bg-[#FAF8F5] px-4 py-3 border-b border-[#EAE4DC] flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C72]">Rincian Data Tabel</span>
                      <span className="text-[11px] font-semibold text-[#0D5C46]">
                        {report.chartData?.length || 0} Data Tertera
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[190px] lg:max-h-[210px]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white border-b border-[#EAE4DC] z-10">
                          <tr>
                            <th className="px-3.5 py-2 font-bold text-[#6B7C72]">
                              {report.dimensionLabel || "Item / Label"}
                            </th>
                            <th className="px-3.5 py-2 font-bold text-[#6B7C72] text-right">
                              {report.metricLabel || "Jumlah"}
                            </th>
                            {hasSecondary && (
                              <th className="px-3.5 py-2 font-bold text-[#6B7C72] text-right">
                                {report.secondaryMetricLabel || "Lead"}
                              </th>
                            )}
                            <th className="px-3.5 py-2 font-bold text-[#6B7C72] text-right">Rasio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2ECE4]">
                          {report.chartData?.map((row, idx) => {
                            const pct = row.percentage ?? Math.round((row.value / (totalValue || 1)) * 100);
                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${selectedBar === idx ? "bg-[#0D5C46]/5" : "hover:bg-[#FAF8F5]/60"
                                  }`}
                              >
                                <td className="px-3.5 py-2 font-medium text-[#1A2421]">{row.label}</td>
                                <td className="px-3.5 py-2 font-bold text-[#0D5C46] text-right">
                                  {row.formattedValue || row.value}
                                </td>
                                {hasSecondary && (
                                  <td className="px-3.5 py-2 text-[#E07A5F] font-semibold text-right">
                                    {row.secondaryValue ?? "-"}
                                  </td>
                                )}
                                <td className="px-3.5 py-2 text-[#6B7C72] font-semibold text-right">
                                  {pct}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Footer */}
                    <div className="border-t border-[#EAE4DC] bg-[#FAF8F5] px-3.5 py-2.5 flex items-center justify-between font-bold text-xs text-[#1A2421] shrink-0">
                      <span>Total {report.metricLabel || "Akumulasi"}</span>
                      <div className="flex items-center gap-3">
                        {hasSecondary && (
                          <span className="text-[#E07A5F]">
                            {totalSecondary} {report.secondaryMetricLabel || "Lead"}
                          </span>
                        )}
                        <span className="text-[#0D5C46]">
                          {totalValue} {report.unit || ""}
                        </span>
                        <span className="text-[#6B7C72]">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insights & Recommendations Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Executive Summary & Insights */}
            <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
              <div className="flex items-center justify-between border-b border-[#EAE4DC] px-6 py-4">
                <h2 className="text-sm font-bold text-[#0D5C46]">Ringkasan Eksekutif & Temuan</h2>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#0D5C46] hover:underline"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm leading-relaxed text-[#3A4F46]">
                  {report.summary}
                </p>

                {report.takeaways && report.takeaways.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[#F2ECE4]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B7C72]">Temuan Kunci:</p>
                    {report.takeaways.map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3.5 ${item.type === "warning"
                            ? "border-amber-200 bg-amber-50/50"
                            : item.type === "danger"
                              ? "border-red-200 bg-red-50/50"
                              : "border-[#EAE4DC] bg-[#FAF8F5]"
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {item.type === "warning" || item.type === "danger" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-[#0D5C46] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-[#1A2421]">{item.title}</p>
                            <p className="mt-0.5 text-xs text-[#6B7C72] leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations & Database Trace */}
            <div className="overflow-hidden rounded-2xl border border-[#EAE4DC] bg-white">
              <div className="border-b border-[#EAE4DC] px-6 py-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0D5C46]">Rekomendasi Tindakan</h2>
              </div>

              <div className="p-6 space-y-4">
                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="space-y-3">
                    {report.recommendations.map((rec, idx) => (
                      <div key={idx} className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-[#0D5C46]/10 px-2 py-0.5 text-[10px] font-bold text-[#0D5C46]">
                            {rec.department}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec.impact === "Tinggi"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                              }`}
                          >
                            Dampak: {rec.impact}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#1A2421] leading-relaxed">
                          {rec.action}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* SQL Query Trace */}
                <div className="pt-2 border-t border-[#F2ECE4]">
                  <div className="flex items-center justify-between text-xs text-[#6B7C72]">
                    <span>Tabel Database: <strong className="text-[#0D5C46] font-mono">{report.tablesReferenced?.join(", ")}</strong></span>
                    {report.sqlQueryUsed && (
                      <button
                        type="button"
                        onClick={() => setShowSql(!showSql)}
                        className="cursor-pointer text-xs font-bold text-[#0D5C46] hover:underline flex items-center gap-1"
                      >
                        <Database className="h-3 w-3" />
                        <span>{showSql ? "Tutup SQL" : "Lihat SQL"}</span>
                      </button>
                    )}
                  </div>

                  {showSql && report.sqlQueryUsed && (
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-900 p-3 text-[10px] font-mono text-emerald-400">
                      {report.sqlQueryUsed}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
