import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminSubjectRequests from "@/admin/AdminSubjectRequests";
import AdminGulfSubjectRequests from "@/admin/AdminGulfSubjectRequests";

type AdminSubjectRequestsHubProps = {
  defaultTab?: "egyptian" | "gulf";
};

export default function AdminSubjectRequestsHub({ defaultTab = "egyptian" }: AdminSubjectRequestsHubProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "gulf" || requestedTab === "egyptian" ? requestedTab : defaultTab;

  const changeTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">طلبات المواد</h1>
          <p className="mt-1 text-muted-foreground">طلبات المواد المصرية والخليجية في صفحة واحدة.</p>
        </div>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <Tabs value={tab} onValueChange={changeTab} dir="rtl">
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="egyptian">الطلبات المصرية</TabsTrigger>
                <TabsTrigger value="gulf">الطلبات الخليجية</TabsTrigger>
              </TabsList>
              <TabsContent value="egyptian" className="mt-4">
                <AdminSubjectRequests embedded />
              </TabsContent>
              <TabsContent value="gulf" className="mt-4">
                <AdminGulfSubjectRequests embedded />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
