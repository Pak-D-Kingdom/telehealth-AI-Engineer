import { z } from "zod";

export const adminReportQuerySchema = z.object({
  query: z.string().trim().min(1, "Query tidak boleh kosong.").max(1000, "Query terlalu panjang."),
});

export const sqlGenerationOutputSchema = z.object({
  sqlQuery: z.string().trim().min(1),
  tablesReferenced: z.array(z.string().trim()).default([]),
  chartTypeHint: z.preprocess((val) => {
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (lower === "pie" || lower === "donut") return "doughnut";
      if (["bar", "line", "doughnut", "ranking", "table"].includes(lower)) return lower;
    }
    return "bar";
  }, z.enum(["bar", "line", "doughnut", "ranking", "table"])),
  timeRange: z.string().trim().default("Data Terkini"),
});

export const reportSynthesisOutputSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  timeRange: z.string().trim().default("Data Terkini"),
  chartType: z.preprocess((val) => {
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (lower === "pie" || lower === "donut") return "doughnut";
      if (["bar", "line", "doughnut", "ranking", "table"].includes(lower)) return lower;
    }
    return "bar";
  }, z.enum(["bar", "line", "doughnut", "ranking", "table"])),
  dimensionLabel: z.string().trim().optional(),
  metricLabel: z.string().trim().optional(),
  secondaryMetricLabel: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  chartData: z
    .array(
      z.object({
        label: z.string().trim(),
        value: z.coerce.number(),
        secondaryValue: z.coerce.number().optional(),
        percentage: z.coerce.number().optional(),
        color: z.string().optional(),
        secondaryLabel: z.string().optional(),
        formattedValue: z.string().optional(),
      }),
    )
    .optional(),
  tableColumns: z
    .array(
      z.object({
        key: z.string().trim(),
        label: z.string().trim(),
        align: z.enum(["left", "center", "right"]).optional(),
      }),
    )
    .optional(),
  tableRows: z.array(z.record(z.string(), z.any())).optional(),
  takeaways: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item, idx) => {
          if (typeof item === "string") {
            return {
              title: `Temuan ${idx + 1}`,
              description: item,
              type: "positive",
            };
          }
          if (typeof item === "object" && item !== null) {
            return {
              title: item.title || item.heading || item.name || `Temuan ${idx + 1}`,
              description:
                item.description ||
                item.detail ||
                item.desc ||
                item.title ||
                "Informasi terverifikasi.",
              type: ["positive", "warning", "neutral", "danger"].includes(item.type)
                ? item.type
                : "positive",
            };
          }
          return {
            title: `Temuan ${idx + 1}`,
            description: "Informasi tercatat.",
            type: "positive",
          };
        });
      }
      return [];
    },
    z.array(
      z.object({
        title: z.string().trim(),
        description: z.string().trim(),
        type: z.enum(["positive", "warning", "neutral", "danger"]).default("positive"),
      }),
    ),
  ),
  recommendations: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item, idx) => {
          if (typeof item === "string") {
            return {
              action: item,
              impact: "Tinggi",
              department: "Operasional",
            };
          }
          if (typeof item === "object" && item !== null) {
            return {
              action:
                item.action || item.recommendation || item.text || `Tindak lanjut ${idx + 1}`,
              impact: ["Tinggi", "Sedang", "Rendah"].includes(item.impact) ? item.impact : "Tinggi",
              department: item.department || item.dept || "Operasional Medis",
            };
          }
          return {
            action: `Rekomendasi ${idx + 1}`,
            impact: "Tinggi",
            department: "Operasional Medis",
          };
        });
      }
      return [];
    },
    z.array(
      z.object({
        action: z.string().trim(),
        impact: z.enum(["Tinggi", "Sedang", "Rendah"]).default("Tinggi"),
        department: z.string().trim(),
      }),
    ),
  ),
  confidenceScore: z.coerce.number().min(0).max(100).default(98.0),
});
