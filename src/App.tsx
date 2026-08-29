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
import StudentSessions from "@/portal/StudentSessions";
import AdminGuard from "@/admin/AdminGuard";
import AdminDashboard from "@/admin/AdminDashboard";
import ClassroomRecordingsAdmin from "@/admin/ClassroomRecordingsAdmin";
import ClassroomSessionsAdmin from "@/admin/ClassroomSessionsAdmin";
import LegalPage from "@/pages/LegalPage";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ScrollToHash from "@/components/ScrollToHash";
import ClassroomZoomManagement from "@/admin/zoom/ClassroomZoomManagement";
import ManualZoomGuard from "@/admin/zoom/ManualZoomGuard";

const queryClient = new QueryClient();

function HomeOrTamaraReturn() {
  const params = new URLSearchParams(window.location.search);
  return params.has("paymentStatus") && params.has("orderId")
    ? <TamaraReturn kind="success" />
    : <Index />;
}

export default function App() {
  return <HelmetProvider><QueryClientProvider client={queryClient}><LanguageProvider><CurrencyProvider><TooltipProvider><Sonner />
    <BrowserRouter><PortalAuthProvider><ScrollToHash /><FloatingWhatsApp /><Routes>
      <Route path="/" element={<HomeOrTamaraReturn />} />
      <Route path="/curricula" element={<AllCurricula />} />
      <Route path="/all-curricula" element={<Navigate to="/curricula" replace />} />
      <Route path="/register" element={<AccountTypeSelect />} />
      <Route path="/register/student" element={<StudentSignup />} />
      <Route path="/payment/tamara/success" element={<TamaraReturn kind="success" />} />
      <Route path="/payment/tamara/failure" element={<TamaraReturn kind="failure" />} />
      <Route path="/payment/tamara/cancel" element={<TamaraReturn kind="cancel" />} />
      <Route path="/payment/paymob/success" element={<TamaraReturn kind="success" />} />
      <Route path="/payment/paymob/failure" element={<TamaraReturn kind="failure" />} />
      <Route path="/payment/paymob/cancel" element={<TamaraReturn kind="cancel" />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:slug" element={<CourseDetails />} />
      <Route path="/privacy-policy" element={<LegalPage slug="privacy-policy" />} />
      <Route path="/terms-and-conditions" element={<LegalPage slug="terms-and-conditions" />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/teacher/signup" element={<TeacherSignup />} />
      <Route path="/portal/teacher/schedule" element={<PortalGuard role="teacher"><PortalSchedule role="teacher" /></PortalGuard>} />
      <Route path="/portal/student/schedule" element={<PortalGuard role="student"><PortalSchedule role="student" /></PortalGuard>} />
      <Route path="/portal/student/sessions" element={<PortalGuard role="student"><StudentSessions /></PortalGuard>} />
      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/classroom-recordings" element={<AdminGuard><ClassroomRecordingsAdmin /></AdminGuard>} />
      <Route path="/admin/classroom-sessions" element={<AdminGuard><ClassroomSessionsAdmin /></AdminGuard>} />
      <Route path="/admin/classroom-zoom" element={<ManualZoomGuard role="admin"><ClassroomZoomManagement /></ManualZoomGuard>} />
      <Route path="/portal/supervisor/classrooms/zoom" element={<ManualZoomGuard role="supervisor"><ClassroomZoomManagement /></ManualZoomGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes></PortalAuthProvider></BrowserRouter>
  </TooltipProvider></CurrencyProvider></LanguageProvider></QueryClientProvider></HelmetProvider>;
}
