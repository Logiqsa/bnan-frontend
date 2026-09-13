import { useQuery } from "@tanstack/react-query";
import { coursesApi, type CourseEnrollment } from "@/api/coursesApi";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const referenceId = (value: CourseEnrollment["course"]) =>
  typeof value === "string" ? value : value?.id || value?._id || "";

export const useActiveCourseEnrollments = () => {
  const { user } = usePortalAuth();
  const query = useQuery({
    queryKey: ["my-course-enrollments"],
    queryFn: coursesApi.myEnrollments,
    enabled: user?.role === "student",
  });
  const byCourseId = new Map(
    (query.data || [])
      .filter((enrollment) => {
        if (enrollment.status !== "active") return false;
        const course = typeof enrollment.course === "object" ? enrollment.course : null;
        return !course || !("status" in course) || (course.status !== "completed" && course.status !== "cancelled");
      })
      .map((enrollment) => [referenceId(enrollment.course), enrollment]),
  );
  return { ...query, byCourseId };
};
