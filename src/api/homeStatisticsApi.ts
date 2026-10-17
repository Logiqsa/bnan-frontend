import { apiRequest } from "./client";

export type HomeStatisticKey = "courses" | "teachers" | "satisfaction" | "students";
export interface HomeStatistic { key: HomeStatisticKey; label: string; value: number; suffix: string; decimals: number; }
export interface HomeStatisticsSettings { statistics: HomeStatistic[]; }
type Envelope = { success: true; data: HomeStatisticsSettings };

export const homeStatisticsApi = {
  public: async () => (await apiRequest<Envelope>("/home-statistics")).data,
  admin: async () => (await apiRequest<Envelope>("/admin/home-statistics")).data,
  update: async (data: HomeStatisticsSettings) => (await apiRequest<Envelope>("/admin/home-statistics", { method: "PUT", body: JSON.stringify(data) })).data,
};
