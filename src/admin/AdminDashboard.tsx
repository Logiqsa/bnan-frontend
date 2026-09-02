import { useSearchParams } from "react-router-dom";
import { Award, FileText, GraduationCap, MessageSquare, Star, UserRound, Users, Video } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import TestimonialImagesAdmin from "./TestimonialImagesAdmin";
import TestimonialRatingsAdmin from "./TestimonialRatingsAdmin";
import SuccessStoriesAdmin from "./SuccessStoriesAdmin";
import ZoomAccountsAdmin from "./zoom/ZoomAccountsAdmin";
import GradeZoomAssignmentAdmin from "./zoom/GradeZoomAssignmentAdmin";
import LegalPagesAdmin from "./LegalPagesAdmin";
import TeacherApplicationsAdmin from "./TeacherApplicationsAdmin";
import UsersAdmin from "./UsersAdmin";
import { useLanguage } from "@/i18n/LanguageContext";
import AdminsAdmin from "./AdminsAdmin";

const DEFAULT_TAB = "overview";

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || DEFAULT_TAB;
  const { isArabic, pick } = useLanguage();

  const setTab = (value: string) => setSearchParams({ tab: value });

  return (
    <DashboardLayout>
      <Tabs value={tab} onValueChange={setTab} dir={isArabic ? "rtl" : "ltr"}>
        <TabsContent value="overview" className="mt-0">
          <div className="mb-6"><h1 className="text-3xl font-bold">{pick("لوحة الإدارة","Admin dashboard")}</h1><p className="mt-1 text-muted-foreground">{pick("اختر القسم الذي تريد إدارته.","Choose a section to manage.")}</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["teacher-applications",GraduationCap,"طلبات المعلمين","Teacher applications"],
              ["users",UserRound,"المستخدمون","Users"],
              ["supervisors",Users,"المشرفون","Supervisors"],
              ["admins",Users,"الأدمنز","Administrators"],
              ["testimonials",Star,"آراء العملاء","Testimonials"],
              ["testimonial-ratings",MessageSquare,"تقييمات العملاء","Customer ratings"],
              ["success-stories",Award,"قصص النجاح","Success stories"],
              ["zoom-accounts",Video,"حسابات زوم","Zoom accounts"],
              ["zoom-grades",Users,"ربط الصفوف بـ Zoom","Assign classes to Zoom"],
              ["classroom-zoom",Video,"Zoom للفصول اليدوية","Manual classroom Zoom"],
              ["legal-pages",FileText,"الصفحات القانونية","Legal pages"],
            ].map(([value,Icon,arabic,english])=><button key={value as string} onClick={()=>value === "classroom-zoom" ? window.location.assign("/admin/classroom-zoom") : setTab(value as string)} className="text-start"><Card className="h-full transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-sky"><CardContent className="flex items-center gap-4 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary"/></span><span className="font-semibold">{pick(arabic as string,english as string)}</span></CardContent></Card></button>)}
          </div>
        </TabsContent>
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
        <TabsContent value="teacher-applications" className="mt-0">
          <TeacherApplicationsAdmin />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersAdmin title={pick("المستخدمون","Users")} description={pick("عرض وإدارة جميع الطلاب وأولياء الأمور والمعلمين.","View and manage all students, parents, and teachers.")} roles={["student", "parent", "teacher"]} />
        </TabsContent>
        <TabsContent value="supervisors" className="mt-0">
          <UsersAdmin title={pick("المشرفون","Supervisors")} description={pick("عرض حسابات المشرفين المسجلة في النظام.","View supervisor accounts registered in the system.")} roles={["supervisor"]} />
        </TabsContent>
        <TabsContent value="admins" className="mt-0">
          <AdminsAdmin />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
