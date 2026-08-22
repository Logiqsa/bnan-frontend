// بيانات تجريبية مؤقتة لعرض التصميم فقط — تُستبدل لاحقًا بمصدر البيانات الفعلي للتقييمات.
export interface Testimonial {
  id: string;
  full_name: string;
  message: string;
  rating: number;
  approved: boolean;
  created_at: string;
}

export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    full_name: "أم عبدالله",
    message: "تجربة رائعة مع أكاديمية بنان، المعلمات متابعات جدًا وابني تحسّن كتير.",
    rating: 5,
    approved: true,
    created_at: "2026-08-10T10:00:00Z",
  },
  {
    id: "2",
    full_name: "محمد العتيبي",
    message: "المنصة سهلة والمعلم كان محترف، بس حابب لو فيه تسجيلات أكتر للحصص.",
    rating: 4,
    approved: true,
    created_at: "2026-08-12T14:30:00Z",
  },
  {
    id: "3",
    full_name: "سارة أحمد",
    message: "الدعم الفني سريع والاهتمام بالطالبة كبير، شكرًا لكم.",
    rating: 5,
    approved: true,
    created_at: "2026-08-15T09:15:00Z",
  },
  {
    id: "4",
    full_name: "خالد الحربي",
    message: "بداية طيبة، بنتظر نشوف نتائج أوضح بعد شهرين.",
    rating: 3,
    approved: false,
    created_at: "2026-08-18T18:45:00Z",
  },
  {
    id: "5",
    full_name: "منى يوسف",
    message: "ابني بقى يحب المذاكرة أكتر من الأول، جزاكم الله خير.",
    rating: 5,
    approved: false,
    created_at: "2026-08-20T11:20:00Z",
  },
];
