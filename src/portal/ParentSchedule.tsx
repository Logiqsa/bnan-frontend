import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/api/parentApi";
import PortalSchedule from "./PortalSchedule";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ParentSchedule() {
  const { pick } = useLanguage();
  const childrenQuery = useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => (await parentApi.getChildren()).data,
  });
  const [selectedChildId, setSelectedChildId] = useState("");

  useEffect(() => {
    const children = childrenQuery.data || [];
    if (!selectedChildId && children[0]?.id) setSelectedChildId(children[0].id);
    if (selectedChildId && !children.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(children[0]?.id || "");
    }
  }, [childrenQuery.data, selectedChildId]);

  if (childrenQuery.isLoading) return <DashboardLayout><div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-20 w-full"/><Skeleton className="h-[590px] w-full"/></div></DashboardLayout>;
  if (childrenQuery.isError) return <DashboardLayout><Card className="mx-auto max-w-xl"><CardContent className="grid min-h-52 place-items-center gap-3 p-6 text-center"><p>{pick("تعذر تحميل قائمة الأبناء.", "Unable to load children.")}</p><Button onClick={() => void childrenQuery.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card></DashboardLayout>;
  if (!childrenQuery.data?.length) return <DashboardLayout><Card className="mx-auto max-w-xl"><CardContent className="grid min-h-52 place-items-center p-6 text-center text-muted-foreground">{pick("لا يوجد أبناء مرتبطون بهذا الحساب.", "No children are linked to this account.")}</CardContent></Card></DashboardLayout>;

  const selectedChild = childrenQuery.data.find((child) => child.id === selectedChildId) || childrenQuery.data[0];
  const selector = <Card className="mb-5"><CardContent className="p-4 sm:p-5"><label className="block text-sm font-semibold">{pick("الابن", "Child")}<select aria-label={pick("اختر الابن", "Select child")} className="mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal" value={selectedChild.id} onChange={(event) => setSelectedChildId(event.target.value)}>{childrenQuery.data.map((child) => <option key={child.id} value={child.id}>{child.fullName}{child.grade?.name ? ` — ${child.grade.name}` : ""}</option>)}</select></label></CardContent></Card>;

  return <PortalSchedule role="parent" studentId={selectedChild.id} studentName={selectedChild.fullName} toolbar={selector} />;
}
