import { forwardRef } from "react";
import logoBnan from "@/assets/logo-bnan.png";

export interface TeacherCertificateData {
  teacherName: string;
  title: string;
  reason?: string;
  monthYear?: string;
  issuerName?: string;
  issuerRole?: string;
  signatureName?: string;
  awardedAt?: string; // ISO date
  subjectLabel?: string; // e.g. "معلمة اللغة العربية"
}

interface Props {
  data: TeacherCertificateData;
}

/**
 * Best Teacher certificate — premium navy + gold edition.
 * Inspired by the BNAN brand poster: deep navy background, gold trophy & laurels,
 * ribbon banner with the teacher name, and a small subject pill underneath.
 * Fixed size 1086x768 (landscape A4-ish) for consistent PDF rendering.
 */
const TeacherCertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const {
    teacherName,
    title,
    reason,
    monthYear,
    issuerName,
    issuerRole,
    signatureName,
    awardedAt,
    subjectLabel,
  } = data;

  // Palette
  const NAVY_DEEP = "#0A1530";
  const NAVY = "#0E1C3E";
  const NAVY_SOFT = "#16264F";
  const GOLD = "#F2B739";
  const GOLD_LIGHT = "#FFD86B";
  const GOLD_DEEP = "#B8821F";
  const CREAM = "#FDF6E3";
  const INK = "#1B2645";
  const MUTED = "#C9D2E6";

  const dateStr = awardedAt
    ? new Date(awardedAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  // Subtle scattered icons across the dark background (graduation caps, books, scribbles)
  const scatter = [
    { top: "6%", left: "8%", rotate: -18, size: 26, char: "🎓" },
    { top: "10%", right: "12%", rotate: 14, size: 22, char: "🎓" },
    { top: "22%", left: "4%", rotate: 22, size: 20, char: "📖" },
    { top: "28%", right: "5%", rotate: -10, size: 24, char: "🎓" },
    { bottom: "18%", left: "6%", rotate: -8, size: 22, char: "📖" },
    { bottom: "10%", right: "8%", rotate: 18, size: 26, char: "🎓" },
    { top: "48%", left: "3%", rotate: 0, size: 18, char: "✦" },
    { top: "55%", right: "3%", rotate: 0, size: 18, char: "✦" },
  ] as const;

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        width: "1086px",
        height: "768px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        background: `radial-gradient(ellipse at 50% 38%, ${NAVY_SOFT} 0%, ${NAVY} 45%, ${NAVY_DEEP} 100%)`,
        color: "#fff",
      }}
    >
      {/* Scattered background motifs (very subtle) */}
      {scatter.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: (s as any).top,
            bottom: (s as any).bottom,
            left: (s as any).left,
            right: (s as any).right,
            transform: `rotate(${s.rotate}deg)`,
            fontSize: `${s.size}px`,
            color: GOLD,
            opacity: 0.08,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {s.char}
        </div>
      ))}

      {/* Soft golden glow behind the trophy area */}
      <div
        style={{
          position: "absolute",
          top: "150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "560px",
          height: "560px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}33 0%, ${GOLD}11 35%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Double gold border frame */}
      <div
        style={{
          position: "absolute",
          inset: "18px",
          border: `2px solid ${GOLD}`,
          borderRadius: "14px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "26px",
          border: `1px solid ${GOLD}55`,
          borderRadius: "10px",
          pointerEvents: "none",
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 14, right: 14, rot: 0 },
        { top: 14, left: 14, rot: 90 },
        { bottom: 14, left: 14, rot: 180 },
        { bottom: 14, right: 14, rot: 270 },
      ].map((c, i) => (
        <div
          key={`corner-${i}`}
          style={{
            position: "absolute",
            top: (c as any).top,
            bottom: (c as any).bottom,
            left: (c as any).left,
            right: (c as any).right,
            width: "70px",
            height: "70px",
            transform: `rotate(${c.rot}deg)`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderTop: `3px solid ${GOLD}`,
              borderRight: `3px solid ${GOLD}`,
              borderTopRightRadius: "10px",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 14,
              height: 14,
              borderTop: `2px solid ${GOLD_LIGHT}`,
              borderRight: `2px solid ${GOLD_LIGHT}`,
            }}
          />
        </div>
      ))}

      {/* Logo (top right in RTL) */}
      <div
        style={{
          position: "absolute",
          top: "44px",
          right: "54px",
          background: "rgba(255,255,255,0.96)",
          padding: "8px 14px",
          borderRadius: "10px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          zIndex: 4,
        }}
      >
        <img src={logoBnan} alt="BNAN" style={{ height: "54px", objectFit: "contain", display: "block" }} />
      </div>

      {/* English eyebrow (top left in RTL) */}
      <div
        style={{
          position: "absolute",
          top: "58px",
          left: "60px",
          fontSize: "11px",
          letterSpacing: "4px",
          color: GOLD_LIGHT,
          fontWeight: 600,
          zIndex: 4,
        }}
      >
        CERTIFICATE · OF · EXCELLENCE
      </div>

      {/* MAIN TITLE */}
      <div
        style={{
          position: "absolute",
          top: "118px",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontSize: "60px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "1px",
            lineHeight: 1,
            textShadow: `0 2px 0 ${NAVY_DEEP}, 0 0 24px ${GOLD}55`,
          }}
        >
          {title || "المعلم المثالي"}
        </div>
        {/* gold underline accent */}
        <div
          style={{
            margin: "16px auto 0",
            width: "180px",
            height: "3px",
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }}
        />
      </div>

      {/* TROPHY illustration — premium gold trophy on a pedestal (no laurels) */}
      <div
        style={{
          position: "absolute",
          top: "208px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "420px",
          height: "330px",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {/* Radiant sunburst halo behind the trophy */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "360px",
            height: "260px",
            background: `conic-gradient(from 90deg at 50% 70%, transparent 0deg, ${GOLD}22 6deg, transparent 12deg, transparent 24deg, ${GOLD}22 30deg, transparent 36deg, transparent 48deg, ${GOLD}22 54deg, transparent 60deg, transparent 72deg, ${GOLD}22 78deg, transparent 84deg, transparent 96deg, ${GOLD}22 102deg, transparent 108deg, transparent 120deg, ${GOLD}22 126deg, transparent 132deg, transparent 144deg, ${GOLD}22 150deg, transparent 156deg, transparent 168deg, ${GOLD}22 174deg, transparent 180deg, transparent 360deg)`,
            maskImage: "radial-gradient(circle at 50% 70%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 70%, black 20%, transparent 70%)",
            opacity: 0.85,
            pointerEvents: "none",
          }}
        />

        {/* Soft golden bloom directly behind cup */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD_LIGHT}55 0%, ${GOLD}22 40%, transparent 70%)`,
            filter: "blur(8px)",
          }}
        />

        {/* The trophy itself */}
        <div
          style={{
            position: "relative",
            width: "230px",
            height: "300px",
            zIndex: 3,
          }}
        >
          {/* Cup body */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "20px",
              right: "20px",
              height: "165px",
              background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 45%, ${GOLD_DEEP} 100%)`,
              borderRadius: "16px 16px 100px 100px / 16px 16px 70px 70px",
              boxShadow: `inset -12px -10px 28px ${GOLD_DEEP}cc, inset 12px 12px 28px #FFE9A8cc, 0 14px 30px rgba(0,0,0,0.55)`,
              border: `2px solid ${GOLD_DEEP}`,
            }}
          />

          {/* Glossy highlight on cup */}
          <div
            style={{
              position: "absolute",
              top: "22px",
              left: "40px",
              width: "36px",
              height: "90px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0))",
              borderRadius: "50%",
              filter: "blur(2px)",
              opacity: 0.7,
            }}
          />

          {/* Decorative gold band near rim */}
          <div
            style={{
              position: "absolute",
              top: "26px",
              left: "20px",
              right: "20px",
              height: "14px",
              background: `linear-gradient(180deg, ${GOLD_DEEP}, ${GOLD_LIGHT}, ${GOLD_DEEP})`,
              borderTop: `1px solid ${GOLD_LIGHT}`,
              borderBottom: `1px solid #6E4D14`,
              boxShadow: `inset 0 2px 0 ${GOLD_LIGHT}cc`,
            }}
          />

          {/* Star on cup */}
          <div
            style={{
              position: "absolute",
              top: "70px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "64px",
              color: NAVY_DEEP,
              textShadow: `0 0 10px ${GOLD_LIGHT}, 0 2px 0 ${GOLD_DEEP}`,
              lineHeight: 1,
              zIndex: 2,
              fontWeight: 900,
            }}
          >
            ★
          </div>

          {/* Left handle */}
          <div
            style={{
              position: "absolute",
              top: "36px",
              left: "-14px",
              width: "44px",
              height: "82px",
              border: `9px solid ${GOLD}`,
              borderRight: "none",
              borderRadius: "44px 0 0 44px",
              boxShadow: `inset 5px 0 10px ${GOLD_DEEP}88, -2px 2px 6px rgba(0,0,0,0.4)`,
              background: `linear-gradient(90deg, ${GOLD_DEEP}, transparent)`,
            }}
          />
          {/* Right handle */}
          <div
            style={{
              position: "absolute",
              top: "36px",
              right: "-14px",
              width: "44px",
              height: "82px",
              border: `9px solid ${GOLD}`,
              borderLeft: "none",
              borderRadius: "0 44px 44px 0",
              boxShadow: `inset -5px 0 10px ${GOLD_DEEP}88, 2px 2px 6px rgba(0,0,0,0.4)`,
              background: `linear-gradient(270deg, ${GOLD_DEEP}, transparent)`,
            }}
          />

          {/* Stem */}
          <div
            style={{
              position: "absolute",
              top: "178px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "36px",
              height: "44px",
              background: `linear-gradient(180deg, ${GOLD_DEEP}, ${GOLD} 50%, ${GOLD_DEEP})`,
              borderRadius: "5px",
              boxShadow: `inset 0 0 6px ${GOLD_DEEP}, 0 4px 8px rgba(0,0,0,0.4)`,
            }}
          />

          {/* Pedestal — top tier */}
          <div
            style={{
              position: "absolute",
              top: "222px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "150px",
              height: "20px",
              background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DEEP} 100%)`,
              borderRadius: "6px",
              border: `1px solid ${GOLD_DEEP}`,
              boxShadow: `inset 0 2px 0 ${GOLD_LIGHT}aa, 0 2px 4px rgba(0,0,0,0.3)`,
            }}
          />

          {/* Pedestal — bottom tier (wider) */}
          <div
            style={{
              position: "absolute",
              top: "246px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "190px",
              height: "26px",
              background: `linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
              borderRadius: "8px",
              border: `1px solid ${GOLD_DEEP}`,
              boxShadow: `inset 0 2px 0 ${GOLD_LIGHT}aa, 0 10px 20px rgba(0,0,0,0.55)`,
            }}
          />

          {/* Pedestal nameplate accent */}
          <div
            style={{
              position: "absolute",
              top: "252px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "120px",
              height: "12px",
              background: `linear-gradient(180deg, ${NAVY_DEEP}, ${NAVY})`,
              borderRadius: "3px",
              border: `1px solid ${GOLD_DEEP}`,
              boxShadow: `inset 0 0 4px rgba(0,0,0,0.6)`,
            }}
          />

          {/* Sparkles — bigger, more magical */}
          <div style={{ position: "absolute", top: "20px", left: "-46px", color: GOLD_LIGHT, fontSize: "22px", textShadow: `0 0 12px ${GOLD}` }}>✦</div>
          <div style={{ position: "absolute", top: "-6px", right: "-20px", color: GOLD_LIGHT, fontSize: "16px", textShadow: `0 0 8px ${GOLD}` }}>✦</div>
          <div style={{ position: "absolute", top: "94px", right: "-58px", color: GOLD_LIGHT, fontSize: "20px", textShadow: `0 0 10px ${GOLD}` }}>✦</div>
          <div style={{ position: "absolute", top: "130px", left: "-58px", color: GOLD_LIGHT, fontSize: "14px", textShadow: `0 0 8px ${GOLD}` }}>✦</div>
          <div style={{ position: "absolute", top: "60px", right: "-44px", color: GOLD_LIGHT, fontSize: "12px", textShadow: `0 0 6px ${GOLD}` }}>✧</div>
          <div style={{ position: "absolute", top: "180px", left: "-30px", color: GOLD_LIGHT, fontSize: "12px", textShadow: `0 0 6px ${GOLD}` }}>✧</div>
        </div>
      </div>

      {/* RIBBON BANNER with teacher name */}
      <div
        style={{
          position: "absolute",
          top: "498px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "640px",
          height: "78px",
          zIndex: 5,
        }}
      >
        {/* left ribbon tail */}
        <div
          style={{
            position: "absolute",
            left: "-26px",
            top: "20px",
            width: "60px",
            height: "40px",
            background: GOLD_DEEP,
            clipPath: "polygon(0 0, 100% 10%, 80% 50%, 100% 90%, 0 100%)",
          }}
        />
        {/* right ribbon tail */}
        <div
          style={{
            position: "absolute",
            right: "-26px",
            top: "20px",
            width: "60px",
            height: "40px",
            background: GOLD_DEEP,
            clipPath: "polygon(100% 0, 0 10%, 20% 50%, 0 90%, 100% 100%)",
          }}
        />
        {/* main banner */}
        <div
          style={{
            position: "absolute",
            inset: "0 30px",
            background: `linear-gradient(180deg, #FFFCF2 0%, ${CREAM} 100%)`,
            borderRadius: "8px",
            border: `2px solid ${GOLD}`,
            boxShadow: `0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 4px #fff`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 30px",
          }}
        >
          <div
            style={{
              fontSize: "34px",
              fontWeight: 900,
              color: INK,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            <span style={{ color: GOLD_DEEP, marginLeft: "8px" }}>أ /</span>
            {teacherName || "—"}
          </div>
        </div>
      </div>

      {/* Subject / role pill below the ribbon */}
      <div
        style={{
          position: "absolute",
          top: "596px",
          left: "50%",
          transform: "translateX(-50%)",
          background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`,
          color: NAVY_DEEP,
          padding: "10px 32px",
          borderRadius: "999px",
          fontSize: "18px",
          fontWeight: 800,
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          border: `1px solid ${GOLD_DEEP}`,
          zIndex: 5,
          maxWidth: "560px",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subjectLabel || reason || "تقديراً للتميز والعطاء"}
      </div>

      {/* Month year line (small) */}
      {monthYear && (
        <div
          style={{
            position: "absolute",
            top: "650px",
            left: 0,
            right: 0,
            textAlign: "center",
            color: MUTED,
            fontSize: "13px",
            letterSpacing: "1px",
            zIndex: 5,
          }}
        >
          عن شهر · <span style={{ color: GOLD_LIGHT, fontWeight: 700 }}>{monthYear}</span>
        </div>
      )}

      {/* FOOTER: signature (right) + date (left) */}
      <div
        style={{
          position: "absolute",
          bottom: "44px",
          left: "70px",
          right: "70px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          zIndex: 5,
        }}
      >
        {/* Signature (right in RTL) */}
        <div style={{ textAlign: "center", color: "#fff", minWidth: "240px" }}>
          <div
            style={{
              fontFamily: "'Pinyon Script', 'Brush Script MT', cursive",
              fontSize: "26px",
              color: GOLD_LIGHT,
              minHeight: "32px",
              lineHeight: 1,
            }}
          >
            {signatureName || ""}
          </div>
          <div
            style={{
              borderTop: `1.5px solid ${GOLD}`,
              paddingTop: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {issuerName || "—"}
            {issuerRole ? (
              <span style={{ color: MUTED, fontWeight: 400 }}> — {issuerRole}</span>
            ) : null}
          </div>
        </div>

        {/* Center seal */}
        <div
          style={{
            width: "78px",
            height: "78px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD_LIGHT} 0%, ${GOLD} 60%, ${GOLD_DEEP} 100%)`,
            border: `3px solid ${GOLD_DEEP}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: NAVY_DEEP,
            fontWeight: 900,
            position: "relative",
          }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "1px", lineHeight: 1 }}>BNAN</div>
          <div style={{ fontSize: "20px", lineHeight: 1, marginTop: "2px" }}>★</div>
          <div style={{ fontSize: "8px", marginTop: "2px", letterSpacing: "1px" }}>ACADEMY</div>
        </div>

        {/* Date (left in RTL) */}
        <div style={{ textAlign: "center", color: "#fff", minWidth: "240px" }}>
          <div style={{ fontSize: "12px", color: MUTED, marginBottom: "6px", letterSpacing: "1px" }}>
            تاريخ الإصدار
          </div>
          <div
            style={{
              borderTop: `1.5px solid ${GOLD}`,
              paddingTop: "6px",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {dateStr}
          </div>
        </div>
      </div>
    </div>
  );
});

TeacherCertificateTemplate.displayName = "TeacherCertificateTemplate";
export default TeacherCertificateTemplate;
