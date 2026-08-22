import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";
import TestimonialImagesAdmin from "./TestimonialImagesAdmin";
import TestimonialRatingsAdmin from "./TestimonialRatingsAdmin";
import SuccessStoriesAdmin from "./SuccessStoriesAdmin";
import ZoomAccountsAdmin from "./zoom/ZoomAccountsAdmin";
import GradeZoomAssignmentAdmin from "./zoom/GradeZoomAssignmentAdmin";

const DEFAULT_TAB = "testimonials";

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || DEFAULT_TAB;

  useEffect(() => {
    if (!searchParams.get("tab")) setSearchParams({ tab: DEFAULT_TAB }, { replace: true });
  }, [searchParams, setSearchParams]);

  const setTab = (value: string) => setSearchParams({ tab: value });

  return (
    <DashboardLayout>
      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList>
          <TabsTrigger value="testimonials">آراء عملائنا</TabsTrigger>
          <TabsTrigger value="testimonial-ratings">تقييمات العملاء</TabsTrigger>
          <TabsTrigger value="success-stories">قصص النجاح</TabsTrigger>
          <TabsTrigger value="zoom-accounts">حسابات زوم</TabsTrigger>
          <TabsTrigger value="zoom-grades">ربط الصفوف بـ Zoom</TabsTrigger>
        </TabsList>
        <TabsContent value="testimonials" className="mt-4">
          <TestimonialImagesAdmin />
        </TabsContent>
        <TabsContent value="testimonial-ratings" className="mt-4">
          <TestimonialRatingsAdmin />
        </TabsContent>
        <TabsContent value="success-stories" className="mt-4">
          <SuccessStoriesAdmin />
        </TabsContent>
        <TabsContent value="zoom-accounts" className="mt-4">
          <ZoomAccountsAdmin onGoToGradeAssignment={() => setTab("zoom-grades")} />
        </TabsContent>
        <TabsContent value="zoom-grades" className="mt-4">
          <GradeZoomAssignmentAdmin />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
