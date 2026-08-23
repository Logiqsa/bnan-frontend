import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";
import TestimonialImagesAdmin from "./TestimonialImagesAdmin";
import TestimonialRatingsAdmin from "./TestimonialRatingsAdmin";
import SuccessStoriesAdmin from "./SuccessStoriesAdmin";
import ZoomAccountsAdmin from "./zoom/ZoomAccountsAdmin";
import GradeZoomAssignmentAdmin from "./zoom/GradeZoomAssignmentAdmin";
import LegalPagesAdmin from "./LegalPagesAdmin";

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
        <TabsContent value="testimonials" className="mt-0">
          <TestimonialImagesAdmin />
        </TabsContent>
        <TabsContent value="testimonial-ratings" className="mt-0">
          <TestimonialRatingsAdmin />
        </TabsContent>
        <TabsContent value="success-stories" className="mt-0">
          <SuccessStoriesAdmin />
        </TabsContent>
        <TabsContent value="zoom-accounts" className="mt-0">
          <ZoomAccountsAdmin onGoToGradeAssignment={() => setTab("zoom-grades")} />
        </TabsContent>
        <TabsContent value="zoom-grades" className="mt-0">
          <GradeZoomAssignmentAdmin />
        </TabsContent>
        <TabsContent value="legal-pages" className="mt-0">
          <LegalPagesAdmin />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
