import { apiRequest } from "./client";

export type HomeStatisticKey = "courses" | "teachers" | "satisfaction" | "students";
export interface HomeStatistic { key: HomeStatisticKey; label: string; value: number; suffix: string; decimals: number; }
export interface HomeStatisticsSettings { statistics: HomeStatistic[]; }
type Envelope = { success: true; data: HomeStatisticsSettings };

export const normalizeHomeStatisticSuffix = (suffix: string) => {
  const value = suffix.trim();
  if (["", "+", "%", "ألف", " ألف"].includes(value)) return value === "ألف" ? " ألف" : value;
  if (value.includes("ألف")) return " ألف";
  if (value.includes("%")) return "%";
  if (value.includes("+")) return "+";
  return "";
};

const normalize = (settings: HomeStatisticsSettings): HomeStatisticsSettings => ({
  statistics: settings.statistics.map((statistic) => ({ ...statistic, suffix: normalizeHomeStatisticSuffix(statistic.suffix) })),
});

export const homeStatisticsApi = {
  public: async () => normalize((await apiRequest<Envelope>("/home-statistics")).data),
  admin: async () => normalize((await apiRequest<Envelope>("/admin/home-statistics")).data),
  update: async (data: HomeStatisticsSettings) => normalize((await apiRequest<Envelope>("/admin/home-statistics", { method: "PUT", body: JSON.stringify(data) })).data),
};
