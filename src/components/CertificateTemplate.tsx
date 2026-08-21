import { forwardRef } from "react";
import logoBnan from "@/assets/logo-bnan.png";

export interface CertificateGrade {
  subject: string;
  max_score: number | string;
  score: number | string;
}

export interface CertificateTemplateData {
  studentName: string;
  gradeLevel: string;
  grades: CertificateGrade[];
  signatureName?: string;
}

interface Props {
  data: CertificateTemplateData;
}

/**
 * Certificate visual template — designed to match BNAN academy certificate.
 * Rendered at fixed pixel size (1086 x 614) so html2canvas → jsPDF produces a clean image.
 */
const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const { studentName, gradeLevel, grades, signatureName } = data;

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        width: "1086px",
        height: "614px",
        background: "#ffffff",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top corner accents */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "180px",
          height: "60px",
          background: "#0E1C3E",
          borderBottomRightRadius: "60px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 130,
          width: "120px",
          height: "44px",
          background: "#F5A524",
          borderBottomRightRadius: "60px",
        }}
      />

      {/* Outer rounded border frame */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "3px solid #0E1C3E",
          borderRadius: "30px",
          padding: "30px 40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header row: spacer + Certificate title + logo (left) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ width: "120px", height: "70px" }} />
          <div
            style={{
              fontFamily: "'Pinyon Script', 'Great Vibes', cursive",
              fontSize: "84px",
              color: "#0E1C3E",
              lineHeight: 1,
              fontWeight: 400,
            }}
          >
            Certificate
          </div>
          <img src={logoBnan} alt="BNAN" style={{ height: "70px", objectFit: "contain" }} />
        </div>

        {/* Student info row: name (right) + grade (left) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "2px solid #0E1C3E",
            borderRadius: "40px",
            padding: "14px 36px",
            margin: "16px 0 24px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#0E1C3E",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>اسم الطالب/ـة</span>
            <span style={{ color: "#F5A524" }}>{studentName || "—"}</span>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>الصف</span>
            <span style={{ color: "#0E1C3E" }}>{gradeLevel || "—"}</span>
          </div>
        </div>

        {/* Grades table */}
        <div style={{ flex: 1 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "18px",
              color: "#0E1C3E",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr style={{ background: "#0E1C3E", color: "#fff" }}>
                <th style={cellHeader}>المادة</th>
                {grades.map((g, i) => (
                  <th key={i} style={cellHeader}>{g.subject || "—"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cellBody, background: "#0E1C3E", color: "#fff", fontWeight: 700 }}>الدرجة العظمى</td>
                {grades.map((g, i) => (
                  <td key={i} style={cellBody}>{g.max_score === "" || g.max_score == null ? "—" : g.max_score}</td>
                ))}
              </tr>
              <tr>
                <td style={{ ...cellBody, background: "#0E1C3E", color: "#fff", fontWeight: 700 }}>الدرجة</td>
                {grades.map((g, i) => (
                  <td key={i} style={cellBody}>{g.score === "" || g.score == null ? "—" : g.score}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <div style={{ textAlign: "center", color: "#0E1C3E" }}>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>التوقيع</div>
            <div
              style={{
                marginTop: "8px",
                borderBottom: "2px solid #0E1C3E",
                width: "180px",
                fontFamily: "'Pinyon Script', cursive",
                fontSize: "26px",
                paddingBottom: "2px",
              }}
            >
              {signatureName || ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const cellHeader: React.CSSProperties = {
  border: "1px solid #0E1C3E",
  padding: "10px 6px",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "16px",
};

const cellBody: React.CSSProperties = {
  border: "1px solid #0E1C3E",
  padding: "10px 6px",
  textAlign: "center",
  background: "#fff",
  fontSize: "18px",
};

CertificateTemplate.displayName = "CertificateTemplate";
export default CertificateTemplate;
