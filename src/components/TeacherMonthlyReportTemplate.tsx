import { forwardRef } from "react";
import logoImg from "@/assets/logo-bnan.png";

export interface TeacherMonthlyReportData {
  teacherName: string;
  monthYear: string; // YYYY-MM
  totalLessons: number;
  totalSalary: number;
  currency: string;
  attendancePoints: number;
  assignmentsPoints: number;
  reportsPoints: number;
  manualPoints: number;
  totalPoints: number;
  rank: number | null;
  isIdeal: boolean;
  generatedAt: string;
  notes?: string | null;
}

const fmtMonth = (ym: string) => {
  try {
    return new Date(ym + "-15").toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  } catch { return ym; }
};

const TeacherMonthlyReportTemplate = forwardRef<HTMLDivElement, { data: TeacherMonthlyReportData }>(
  ({ data }, ref) => {
    const total = Math.max(1, Math.abs(data.attendancePoints) + Math.abs(data.assignmentsPoints) + Math.abs(data.reportsPoints) + Math.abs(data.manualPoints));
    const pct = (n: number) => Math.round((Math.abs(n) / total) * 100);

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          width: "1123px",
          minHeight: "794px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          padding: "40px 60px",
          fontFamily: "Cairo, sans-serif",
          color: "#0E1C3E",
          position: "relative",
          border: "8px solid #0E1C3E",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <img src={logoImg} alt="BNAN" style={{ height: 80 }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#64748b" }}>تاريخ الإصدار</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {new Date(data.generatedAt).toLocaleDateString("ar-EG")}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: "#0E1C3E" }}>
            تقرير الأداء الشهري
          </h1>
          <p style={{ fontSize: 22, color: "#7FCEF0", marginTop: 8, fontWeight: 600 }}>
            {fmtMonth(data.monthYear)}
          </p>
        </div>

        {/* Ideal teacher badge */}
        {data.isIdeal && (
          <div style={{
            background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
            color: "#0E1C3E",
            padding: "12px 20px",
            borderRadius: 12,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 20,
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
          }}>
            🏆 المعلم المثالي لشهر {fmtMonth(data.monthYear)}
          </div>
        )}

        {/* Teacher name */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 14, color: "#64748b" }}>الأستاذ/ة</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{data.teacherName}</div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <SummaryCard label="عدد الحصص" value={data.totalLessons.toString()} color="#0E1C3E" />
          <SummaryCard label="إجمالي الراتب" value={`${data.totalSalary.toLocaleString("ar-EG")} ${data.currency}`} color="#ea580c" />
          <SummaryCard label="إجمالي النقاط" value={data.totalPoints.toString()} color="#7FCEF0" />
          <SummaryCard label="الترتيب" value={data.rank ? `#${data.rank}` : "—"} color="#f59e0b" />
        </div>

        {/* Points breakdown */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>
            تفصيل نقاط التميّز
          </h3>
          <PointBar label="نقاط الحضور والالتزام" value={data.attendancePoints} pct={pct(data.attendancePoints)} color="#0E1C3E" />
          <PointBar label="نقاط الواجبات" value={data.assignmentsPoints} pct={pct(data.assignmentsPoints)} color="#7FCEF0" />
          <PointBar label="نقاط التقارير" value={data.reportsPoints} pct={pct(data.reportsPoints)} color="#ea580c" />
          <PointBar label="نقاط يدوية من الإدارة" value={data.manualPoints} pct={pct(data.manualPoints)} color="#f59e0b" />
        </div>

        {data.notes && (
          <div style={{ background: "#f1f5f9", padding: 16, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            <strong>ملاحظات:</strong> {data.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 30, left: 60, right: 60, display: "flex", justifyContent: "space-between", borderTop: "2px solid #0E1C3E", paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>أكاديمية بنان — تقرير تلقائي</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>BNAN Academy © {new Date().getFullYear()}</div>
        </div>
      </div>
    );
  }
);

TeacherMonthlyReportTemplate.displayName = "TeacherMonthlyReportTemplate";

const SummaryCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderTop: `4px solid ${color}`,
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
  }}>
    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
  </div>
);

const PointBar = ({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
      <span>{label}</span>
      <strong style={{ color: value < 0 ? "#dc2626" : color }}>{value > 0 ? `+${value}` : value} نقطة</strong>
    </div>
    <div style={{ background: "#e2e8f0", height: 8, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ background: color, width: `${pct}%`, height: "100%" }} />
    </div>
  </div>
);

export default TeacherMonthlyReportTemplate;
