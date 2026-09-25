import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/hooks/useCurrency";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import Index from "@/pages/Index";
import AllCurricula from "@/pages/AllCurricula";
import AccountTypeSelect from "@/pages/AccountTypeSelect";
import StudentSignup from "@/pages/StudentSignup";
import PaymentReturnDispatcher from "@/pages/PaymentReturnDispatcher";
import StudentSubjectRequestReturn from "@/pages/StudentSubjectRequestReturn";
import StudentSubscriptionRenewalReturn from "@/pages/StudentSubscriptionRenewalReturn";
import StudentCourseEnrollmentReturn from "@/pages/StudentCourseEnrollmentReturn";
import ContactPage from "@/pages/ContactPage";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import NotFound from "@/pages/NotFound";
import { PortalAuthProvider } from "@/portal/PortalAuthContext";
import PortalLogin from "@/portal/PortalLogin";
import ForgotPassword from "@/portal/ForgotPassword";
import ParentAppNotice from "@/portal/ParentAppNotice";
import TeacherSignup from "@/portal/TeacherSignup";
import TeacherDashboard from "@/portal/TeacherDashboard";
import TeacherRequests from "@/portal/TeacherRequests";
import TeacherMessages from "@/portal/TeacherMessages";
import TeacherPayroll from "@/portal/TeacherPayroll";
import TeacherPayrollStatementDetail from "@/portal/TeacherPayrollStatementDetail";
import PortalGuard from "@/portal/PortalGuard";
import PortalSchedule from "@/portal/PortalSchedule";
import StudentSchedule from "@/portal/StudentSchedule";
import StudentSessions from "@/portal/StudentSessions";
import StudentAssignments from "@/portal/StudentAssignments";
import StudentCertificates from "@/portal/StudentCertificates";
import StudentEvaluationHistory from "@/portal/StudentEvaluationHistory";
import StudentDashboard from "@/portal/StudentDashboard";
import StudentNotifications from "@/portal/StudentNotifications";
import StudentNotificationPreferences from "@/portal/StudentNotificationPreferences";
import StudentMessages from "@/portal/StudentMessages";
import StudentSubscriptions from "@/portal/StudentSubscriptions";
import StudentSubscriptionRenewal from "@/portal/StudentSubscriptionRenewal";
import StudentSubjects from "@/portal/StudentSubjects";
import StudentAddSubject from "@/portal/StudentAddSubject";
import StudentSubjectRequestHistory from "@/portal/StudentSubjectRequestHistory";
import StudentClassroomChangeRequests from "@/portal/StudentClassroomChangeRequests";
import AdminGuard from "@/admin/AdminGuard";
import AdminDashboard from "@/admin/AdminDashboard";
import ClassroomRecordingsAdmin from "@/admin/ClassroomRecordingsAdmin";
import ClassroomSessionsAdmin from "@/admin/ClassroomSessionsAdmin";
import LegalPage from "@/pages/LegalPage";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ScrollToHash from "@/components/ScrollToHash";
import ClassroomZoomManagement from "@/admin/zoom/ClassroomZoomManagement";
import ManualZoomGuard from "@/admin/zoom/ManualZoomGuard";
import ZoomAccountUsageAdmin from "@/admin/zoom/ZoomAccountUsageAdmin";
import ClassroomManagement from "@/admin/zoom/ClassroomManagement";
import AdminClassroomHub from "@/admin/AdminClassroomHub";
import AccountSettings from "@/portal/AccountSettings";
import SupervisorSchedule from "@/portal/SupervisorSchedule";
import GlobalNotificationAdmin from "@/admin/GlobalNotificationAdmin";
import AdminNotificationHistory from "@/admin/AdminNotificationHistory";
import ClassroomScheduleManagement from "@/admin/zoom/ClassroomScheduleManagement";
import CoursesAdmin from "@/admin/CoursesAdmin";
import CourseEditorAdmin from "@/admin/CourseEditorAdmin";
import CourseDetailAdmin from "@/admin/CourseDetailAdmin";
import MyCourses from "@/portal/MyCourses";
import CourseEnrollmentDetail from "@/portal/CourseEnrollmentDetail";
import CourseGroupsAdmin from "@/admin/CourseGroupsAdmin";
import TeachersAdmin from "@/admin/TeachersAdmin";
import CourseClassroomScheduleAdmin from "@/admin/CourseClassroomScheduleAdmin";
import TeacherCourses from "@/portal/TeacherCourses";
import TeacherClassrooms from "@/portal/TeacherClassrooms";
import TeacherClassroomSessions from "@/portal/TeacherClassroomSessions";
import TeacherSessionDetails from "@/portal/TeacherSessionDetails";
import TeacherCourseDetail from "@/portal/TeacherCourseDetail";
import TeacherCourseRecordings from "@/portal/TeacherCourseRecordings";
import CourseClassroomSchedule from "@/portal/CourseClassroomSchedule";
import TeacherCourseGroupDetail from "@/portal/TeacherCourseGroupDetail";
import ClientErrorsAdmin from "@/admin/ClientErrorsAdmin";
import ContactSettingsAdmin from "@/admin/ContactSettingsAdmin";
import ClassroomChangeRequestsAdmin from "@/admin/ClassroomChangeRequestsAdmin";
import AdminMessages from "@/admin/AdminMessages";
import AdminPayroll, { AdminTeacherPayrollStatementPage } from "@/admin/AdminPayroll";
import AdminPayrollStatementDetailPage from "@/admin/AdminPayrollStatementDetailPage";
import AdminSubscriptions, { AdminSubscriptionDetail } from "@/admin/AdminSubscriptions";
import AdminCertificates, { AdminCertificateDetail } from "@/admin/AdminCertificates";
import AdminPayments, { AdminPaymentDetail } from "@/admin/AdminPayments";
import { AdminGulfSubjectRequestDetail } from "@/admin/AdminGulfSubjectRequests";
import AdminSubjectRequestsHub from "@/admin/AdminSubjectRequestsHub";
import AdminStudents from "@/admin/AdminStudents";
import AdminStudentDetails from "@/admin/AdminStudentDetails";
import AdminParents from "@/admin/AdminParents";
import AdminParentDetails from "@/admin/AdminParentDetails";
import AdminCatalog from "@/admin/AdminCatalog";
import AdminAssignments, { AdminAssignmentDetails, AdminAssignmentSubmissionDetails } from "@/admin/AdminAssignments";
import { ContactSettingsProvider } from "@/contexts/ContactSettingsContext";

const queryClient = new QueryClient();

function HomeOrTamaraReturn() {
  const params = new URLSearchParams(window.location.search);
  return params.has("paymentStatus") && params.has("orderId") ? (
    <PaymentReturnDispatcher kind="success" />
  ) : (
    <Index />
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <ContactSettingsProvider><PortalAuthProvider>
                  <ScrollToHash />
                  <FloatingWhatsApp />
                  <ScrollToTopButton />
                  <Routes>
                    <Route path="/" element={<HomeOrTamaraReturn />} />
                    <Route path="/curricula" element={<AllCurricula />} />
                    <Route
                      path="/all-curricula"
                      element={<Navigate to="/curricula" replace />}
                    />
                    <Route path="/register" element={<AccountTypeSelect />} />
                    <Route
                      path="/register/student"
                      element={<StudentSignup />}
                    />
                    <Route
                      path="/register/course-student"
                      element={<StudentSignup courseOnly />}
                    />
                    <Route
                      path="/payment/tamara/success"
                      element={<PaymentReturnDispatcher kind="success" />}
                    />
                    <Route
                      path="/payment/tamara/failure"
                      element={<PaymentReturnDispatcher kind="failure" />}
                    />
                    <Route
                      path="/payment/tamara/cancel"
                      element={<PaymentReturnDispatcher kind="cancel" />}
                    />
                    <Route
                      path="/payment/paymob/success"
                      element={<PaymentReturnDispatcher kind="success" />}
                    />
                    <Route
                      path="/payment/paymob/failure"
                      element={<PaymentReturnDispatcher kind="failure" />}
                    />
                    <Route
                      path="/payment/paymob/cancel"
                      element={<PaymentReturnDispatcher kind="cancel" />}
                    />
                    <Route path="/payment/student-subject-request" element={<StudentSubjectRequestReturn />} />
                    <Route path="/portal/student/subscription-renewal-return" element={<StudentSubscriptionRenewalReturn />} />
                    <Route
                      path="/portal/student/course-enrollment-return"
                      element={
                        <PortalGuard role="student">
                          <StudentCourseEnrollmentReturn />
                        </PortalGuard>
                      }
                    />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:slug" element={<CourseDetails />} />
                    <Route
                      path="/privacy-policy"
                      element={<LegalPage slug="privacy-policy" />}
                    />
                    <Route
                      path="/terms-and-conditions"
                      element={<LegalPage slug="terms-and-conditions" />}
                    />
                    <Route path="/portal/login" element={<PortalLogin />} />
                    <Route path="/portal/forgot-password" element={<ForgotPassword />} />
                    <Route path="/portal/parent-app" element={<ParentAppNotice />} />
                    <Route
                      path="/portal/teacher/signup"
                      element={<TeacherSignup />}
                    />
                    <Route
                      path="/portal/teacher"
                      element={
                        <PortalGuard role="teacher">
                          <TeacherDashboard />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/teacher/schedule"
                      element={
                        <PortalGuard role="teacher">
                          <PortalSchedule role="teacher" />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/teacher/requests"
                      element={
                        <PortalGuard role="teacher">
                          <TeacherRequests />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/teacher/messages"
                      element={
                        <PortalGuard role="teacher">
                          <TeacherMessages />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/teacher/payroll"
                      element={<PortalGuard role="teacher"><TeacherPayroll /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/payroll/:payrollId"
                      element={<PortalGuard role="teacher"><TeacherPayroll /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/payroll-statements/:statementId"
                      element={<PortalGuard role="teacher"><TeacherPayrollStatementDetail /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/classrooms"
                      element={<PortalGuard role="teacher"><TeacherClassrooms /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/classrooms/:classroomId"
                      element={<PortalGuard role="teacher"><TeacherClassroomSessions /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/classrooms/:classroomId/sessions/:sessionId"
                      element={<PortalGuard role="teacher"><TeacherSessionDetails /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/courses"
                      element={<PortalGuard role="teacher"><TeacherCourses /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/courses/:courseId"
                      element={<PortalGuard role="teacher"><TeacherCourseDetail /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/courses/:courseId/groups/:groupId"
                      element={<PortalGuard role="teacher"><TeacherCourseGroupDetail /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/course-recordings/:classroomId"
                      element={<PortalGuard role="teacher"><TeacherCourseRecordings /></PortalGuard>}
                    />
                    <Route
                      path="/portal/teacher/course-classrooms/:classroomId/schedule"
                      element={<PortalGuard role="teacher"><CourseClassroomSchedule /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student"
                      element={<PortalGuard role="student"><StudentDashboard /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/notifications"
                      element={<PortalGuard role="student"><StudentNotifications /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/settings/notifications"
                      element={
                        <PortalGuard role="student">
                          <StudentNotificationPreferences />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/settings"
                      element={
                        <PortalGuard role="student">
                          <AccountSettings />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/messages"
                      element={<PortalGuard role="student"><StudentMessages /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/subscriptions"
                      element={<PortalGuard role="student"><StudentSubscriptions /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/subscriptions/:subscriptionId/renew"
                      element={<PortalGuard role="student"><StudentSubscriptionRenewal /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/subjects"
                      element={<PortalGuard role="student"><StudentSubjects /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/subjects/add"
                      element={<PortalGuard role="student"><StudentAddSubject /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/subject-requests"
                      element={<PortalGuard role="student"><StudentSubjectRequestHistory /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/change-requests"
                      element={<PortalGuard role="student"><StudentClassroomChangeRequests /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/schedule"
                      element={
                        <PortalGuard role="student">
                          <StudentSchedule />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/sessions"
                      element={
                        <PortalGuard role="student">
                          <StudentSessions />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/assignments"
                      element={<PortalGuard role="student"><StudentAssignments /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/certificates"
                      element={<PortalGuard role="student"><StudentCertificates /></PortalGuard>}
                    />
                    <Route
                      path="/portal/student/evaluations"
                      element={<PortalGuard role="student"><StudentEvaluationHistory /></PortalGuard>}
                    />
                    <Route
                      path="/admin"
                      element={
                        <AdminGuard>
                          <AdminDashboard />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/messages"
                      element={<AdminGuard><AdminMessages /></AdminGuard>}
                    />
                    <Route
                      path="/admin/payroll"
                      element={<AdminGuard><AdminPayroll /></AdminGuard>}
                    />
                    <Route
                      path="/admin/payroll/statement"
                      element={<AdminGuard><AdminTeacherPayrollStatementPage /></AdminGuard>}
                    />
                    <Route
                      path="/admin/payroll/statements/:statementId"
                      element={<AdminGuard><AdminPayrollStatementDetailPage /></AdminGuard>}
                    />
                    <Route
                      path="/admin/payroll/:payrollId"
                      element={<AdminGuard><AdminPayroll /></AdminGuard>}
                    />
                    <Route path="/admin/subscriptions" element={<AdminGuard><AdminSubscriptions /></AdminGuard>} />
                    <Route path="/admin/subscriptions/:id" element={<AdminGuard><AdminSubscriptionDetail /></AdminGuard>} />
                    <Route path="/admin/certificates" element={<AdminGuard><AdminCertificates /></AdminGuard>} />
                    <Route path="/admin/certificates/:certificateId" element={<AdminGuard><AdminCertificateDetail /></AdminGuard>} />
                    <Route path="/admin/payments" element={<AdminGuard><AdminPayments /></AdminGuard>} />
                    <Route path="/admin/payments/:id" element={<AdminGuard><AdminPaymentDetail /></AdminGuard>} />
                    <Route path="/admin/assignments" element={<AdminGuard><AdminAssignments /></AdminGuard>} />
                    <Route path="/admin/assignments/:id" element={<AdminGuard><AdminAssignmentDetails /></AdminGuard>} />
                    <Route path="/admin/assignments/:id/submissions/:submissionId" element={<AdminGuard><AdminAssignmentSubmissionDetails /></AdminGuard>} />
                    <Route path="/admin/gulf-subject-requests" element={<AdminGuard><AdminSubjectRequestsHub defaultTab="gulf" /></AdminGuard>} />
                    <Route path="/admin/gulf-subject-requests/:id" element={<AdminGuard><AdminGulfSubjectRequestDetail /></AdminGuard>} />
                    <Route path="/admin/subject-requests" element={<AdminGuard><AdminSubjectRequestsHub /></AdminGuard>} />
                    <Route path="/admin/students" element={<AdminGuard><AdminStudents /></AdminGuard>} />
                    <Route path="/admin/students/:id" element={<AdminGuard><AdminStudentDetails /></AdminGuard>} />
                    <Route path="/admin/parents" element={<AdminGuard><AdminParents /></AdminGuard>} />
                    <Route path="/admin/parents/:id" element={<AdminGuard><AdminParentDetails /></AdminGuard>} />
                    <Route
                      path="/admin/client-errors"
                      element={<AdminGuard><ClientErrorsAdmin /></AdminGuard>}
                    />
                    <Route
                      path="/admin/contact-settings"
                      element={<AdminGuard><ContactSettingsAdmin /></AdminGuard>}
                    />
                    <Route
                      path="/admin/classroom-change-requests"
                      element={<AdminGuard><ClassroomChangeRequestsAdmin /></AdminGuard>}
                    />
                    <Route
                      path="/admin/classroom-recordings"
                      element={
                        <AdminGuard>
                          <ClassroomRecordingsAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/classroom-sessions"
                      element={
                        <AdminGuard>
                          <ClassroomSessionsAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/classroom-zoom"
                      element={
                        <ManualZoomGuard role="admin">
                          <ClassroomZoomManagement />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <AdminGuard>
                          <AccountSettings />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/notifications"
                      element={
                        <AdminGuard>
                          <GlobalNotificationAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/notifications/history"
                      element={<AdminGuard><AdminNotificationHistory /></AdminGuard>}
                    />
                    <Route
                      path="/admin/classrooms"
                      element={
                        <AdminGuard>
                          <ClassroomManagement />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/classrooms/:classroomId"
                      element={
                        <AdminGuard>
                          <AdminClassroomHub />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/classrooms/:classroomId/schedule"
                      element={
                        <AdminGuard>
                          <ClassroomScheduleManagement />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/courses"
                      element={
                        <AdminGuard>
                          <CoursesAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route path="/admin/catalog/curriculums" element={<AdminGuard><AdminCatalog /></AdminGuard>} />
                    <Route path="/admin/catalog/grades" element={<AdminGuard><AdminCatalog /></AdminGuard>} />
                    <Route path="/admin/catalog/subjects" element={<AdminGuard><AdminCatalog /></AdminGuard>} />
                    <Route path="/admin/catalog/packages" element={<AdminGuard><AdminCatalog /></AdminGuard>} />
                    <Route
                      path="/admin/teachers"
                      element={
                        <AdminGuard>
                          <TeachersAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/courses/new"
                      element={
                        <AdminGuard>
                          <CourseEditorAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/courses/:courseId"
                      element={
                        <AdminGuard>
                          <CourseDetailAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/courses/:courseId/edit"
                      element={
                        <AdminGuard>
                          <CourseEditorAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/courses/:courseId/groups"
                      element={
                        <AdminGuard>
                          <CourseGroupsAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/course-classrooms/:classroomId/schedule"
                      element={
                        <AdminGuard>
                          <CourseClassroomScheduleAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/zoom-accounts/:id/classrooms"
                      element={
                        <AdminGuard>
                          <ZoomAccountUsageAdmin />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/classrooms"
                      element={
                        <ManualZoomGuard role="supervisor">
                          <ClassroomManagement />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/classrooms/:classroomId/schedule"
                      element={
                        <ManualZoomGuard role="supervisor">
                          <ClassroomScheduleManagement />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/course-classrooms/:classroomId/schedule"
                      element={
                        <PortalGuard role="supervisor">
                          <CourseClassroomScheduleAdmin />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/schedule"
                      element={
                        <ManualZoomGuard role="supervisor">
                          <SupervisorSchedule />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/settings"
                      element={
                        <ManualZoomGuard role="supervisor">
                          <AccountSettings />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/portal/supervisor/classrooms/zoom"
                      element={
                        <ManualZoomGuard role="supervisor">
                          <ClassroomZoomManagement />
                        </ManualZoomGuard>
                      }
                    />
                    <Route
                      path="/portal/teacher/settings"
                      element={
                        <PortalGuard role="teacher">
                          <AccountSettings />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/courses"
                      element={
                        <PortalGuard role="student">
                          <MyCourses />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/portal/student/courses/:enrollmentId"
                      element={
                        <PortalGuard role="student">
                          <CourseEnrollmentDetail />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/my-courses"
                      element={
                        <PortalGuard role="student">
                          <MyCourses />
                        </PortalGuard>
                      }
                    />
                    <Route
                      path="/my-courses/:enrollmentId"
                      element={
                        <PortalGuard role="student">
                          <CourseEnrollmentDetail />
                        </PortalGuard>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PortalAuthProvider></ContactSettingsProvider>
              </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
