import DashboardLayout from "@/layouts/DashboardLayout";
import UsersAdmin from "./UsersAdmin";

export default function TeachersAdmin() {
  return (
    <DashboardLayout>
      <UsersAdmin
        title="المعلمون"
        description="عرض وإدارة حسابات المعلمين المسجلين في النظام."
        roles={["teacher"]}
      />
    </DashboardLayout>
  );
}
