export type ChartType = "bar" | "line" | "doughnut" | "ranking" | "table";
export type TakeawayType = "positive" | "warning" | "neutral" | "danger";
export type ImpactLevel = "Tinggi" | "Sedang" | "Rendah";

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  percentage?: number;
  color?: string;
  secondaryLabel?: string;
  formattedValue?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface TakeawayItem {
  title: string;
  description: string;
  type: TakeawayType;
}

export interface RecommendationItem {
  action: string;
  impact: ImpactLevel;
  department: string;
}

export interface AdminAiReportResult {
  title: string;
  summary: string;
  timeRange: string;
  chartType: ChartType;
  dimensionLabel?: string;
  metricLabel?: string;
  secondaryMetricLabel?: string;
  unit?: string;
  chartData?: ChartDataPoint[];
  tableColumns?: TableColumn[];
  tableRows?: Array<Record<string, unknown>>;
  takeaways: TakeawayItem[];
  recommendations: RecommendationItem[];
  tablesReferenced: string[];
  sqlQueryUsed: string;
  confidenceScore: number;
  generatedAt: string;
}
