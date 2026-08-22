import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/hooks/useCurrency";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Index from "@/pages/Index";
import AllCurricula from "@/pages/AllCurricula";
import AccountTypeSelect from "@/pages/AccountTypeSelect";
import StudentSignup from "@/pages/StudentSignup";
import TamaraReturn from "@/pages/TamaraReturn";
import ContactPage from "@/pages/ContactPage";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import NotFound from "@/pages/NotFound";
import { PortalAuthProvider } from "@/portal/PortalAuthContext";
import PortalLogin from "@/portal/PortalLogin";
import TeacherSignup from "@/portal/TeacherSignup";
import PortalGuard from "@/portal/PortalGuard";
import PortalSchedule from "@/portal/PortalSchedule";
import AdminGuard from "@/admin/AdminGuard";
import AdminDashboard from "@/admin/AdminDashboard";

const queryClient = new QueryClient();
export default function App() {
  return <HelmetProvider><QueryClientProvider client={queryClient}><CurrencyProvider><TooltipProvider><Sonner />
    <BrowserRouter><PortalAuthProvider><FloatingWhatsApp /><Routes>
      <Route path="/" element={<Index />} />
      <Route path="/curricula" element={<AllCurricula />} />
      <Route path="/all-curricula" element={<Navigate to="/curricula" replace />} />
      <Route path="/register" element={<AccountTypeSelect />} />
      <Route path="/register/student" element={<StudentSignup />} />
      <Route path="/payment/tamara/success" element={<TamaraReturn kind="success" />} />
      <Route path="/payment/tamara/failure" element={<TamaraReturn kind="failure" />} />
      <Route path="/payment/tamara/cancel" element={<TamaraReturn kind="cancel" />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:slug" element={<CourseDetails />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/teacher/signup" element={<TeacherSignup />} />
      <Route path="/portal/teacher/schedule" element={<PortalGuard role="teacher"><PortalSchedule role="teacher" /></PortalGuard>} />
      <Route path="/portal/student/schedule" element={<PortalGuard role="student"><PortalSchedule role="student" /></PortalGuard>} />
      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes></PortalAuthProvider></BrowserRouter>
  </TooltipProvider></CurrencyProvider></QueryClientProvider></HelmetProvider>;
}
