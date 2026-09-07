import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ExternalLink, Loader2, Video } from "lucide-react";
import {
  classroomRecordingsApi,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import { courseError } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const recordingsFrom = (
  data:
    | SessionRecording[]
    | { recordings?: SessionRecording[]; data?: SessionRecording[] },
) => (Array.isArray(data) ? data : data.recordings || data.data || []);

export default function TeacherCourseRecordings() {
  const { classroomId = "" } = useParams();
  const query = useQuery({
    queryKey: ["teacher-course-recordings", classroomId],
    queryFn: async () =>
      recordingsFrom(
        (await classroomRecordingsApi.listRecordings(classroomId)).data,
      ),
    enabled: Boolean(classroomId),
  });
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/schedule">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/courses">دوراتي</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>تسجيلات المجموعة</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="ghost" asChild>
          <Link to="/portal/teacher/schedule">
            <ArrowRight className="me-2 h-4 w-4" />
            العودة إلى الجدول
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Video className="h-6 w-6 text-primary" />
            تسجيلات المجموعة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تسجيلات الحصص التي انتهت في هذه المجموعة.
          </p>
        </div>
        {query.isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : query.error ? (
          <p className="rounded-xl border p-8 text-center text-destructive">
            {courseError(query.error)}
          </p>
        ) : !query.data?.length ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              لا توجد تسجيلات متاحة حتى الآن.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {query.data.map((recording, index) => {
              const url =
                recording.localUrl ||
                recording.recordingLink ||
                recording.shareUrl;
              return (
                <Button
                  key={recording.sessionId || index}
                  variant="outline"
                  className="h-auto justify-between p-4"
                  disabled={!url}
                  onClick={() =>
                    url && window.open(url, "_blank", "noopener,noreferrer")
                  }
                >
                  <span>{recording.sessionName || "تسجيل حصة"}</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
