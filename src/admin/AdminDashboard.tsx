import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import TestimonialImagesAdmin from "./TestimonialImagesAdmin";
import SuccessStoriesAdmin from "./SuccessStoriesAdmin";
import ZoomAccountsAdmin from "./zoom/ZoomAccountsAdmin";
import GradeZoomAssignmentAdmin from "./zoom/GradeZoomAssignmentAdmin";
import logo from "@/assets/logo-bnan.png";

export default function AdminDashboard() {
  const { user, logout } = usePortalAuth();
  const [tab, setTab] = useState("testimonials");

  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="أكاديمية بنان" className="h-8 w-auto" />
          <span className="font-cairo font-bold hidden sm:inline">لوحة التحكم</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-tajawal hidden sm:inline">{user?.email}</span>
          <Button size="sm" variant="outline" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList>
            <TabsTrigger value="testimonials">آراء عملائنا</TabsTrigger>
            <TabsTrigger value="success-stories">قصص النجاح</TabsTrigger>
            <TabsTrigger value="zoom-accounts">حسابات زوم</TabsTrigger>
            <TabsTrigger value="zoom-grades">ربط الصفوف بـ Zoom</TabsTrigger>
          </TabsList>
          <TabsContent value="testimonials" className="mt-4">
            <TestimonialImagesAdmin />
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
      </div>
    </div>
  );
}
