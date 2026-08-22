// بيانات تجريبية مؤقتة لعرض التصميم فقط — تُستبدل لاحقًا بمصدر البيانات الفعلي للدورات.
export interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string;
  slug: string;
  grade_level?: string;
  level?: string;
  certificate_enabled?: boolean;
  is_free?: boolean;
  price?: number;
  currency?: string;
}

export const MOCK_COURSES: Course[] = [
  {
    id: "1",
    title: "أساسيات الرياضيات للمرحلة الابتدائية",
    description: "دورة شاملة تغطي أساسيات الحساب والهندسة بأسلوب مبسط وتفاعلي يناسب طلاب المرحلة الابتدائية.",
    slug: "math-basics-primary",
    grade_level: "ابتدائي",
    level: "مبتدئ",
    certificate_enabled: true,
    is_free: false,
    price: 149,
    currency: "SAR",
  },
  {
    id: "2",
    title: "اللغة الإنجليزية المكثفة",
    description: "برنامج مكثف لتقوية مهارات المحادثة والقواعد والكتابة باللغة الإنجليزية لجميع المستويات.",
    slug: "intensive-english",
    grade_level: "جميع المراحل",
    level: "متوسط",
    certificate_enabled: true,
    is_free: false,
    price: 199,
    currency: "SAR",
  },
  {
    id: "3",
    title: "تأسيس في العلوم",
    description: "دورة تأسيسية في مادة العلوم تركّز على بناء الفهم العلمي السليم من خلال تجارب وأمثلة عملية.",
    slug: "science-foundation",
    grade_level: "متوسط",
    level: "مبتدئ",
    certificate_enabled: false,
    is_free: true,
  },
  {
    id: "4",
    title: "القرآن الكريم وأحكام التجويد",
    description: "دورة لتعليم أحكام التلاوة والتجويد بإشراف معلمين متخصصين، مع متابعة فردية لكل طالب.",
    slug: "quran-tajweed",
    grade_level: "جميع المراحل",
    level: "جميع المستويات",
    certificate_enabled: true,
    is_free: false,
    price: 99,
    currency: "SAR",
  },
  {
    id: "5",
    title: "مهارات الحاسب الآلي للمبتدئين",
    description: "تعلّم أساسيات استخدام الحاسب الآلي وبرامج Office الأساسية بخطوات عملية وسهلة.",
    slug: "computer-skills-beginners",
    grade_level: "ثانوي",
    level: "مبتدئ",
    certificate_enabled: true,
    is_free: true,
  },
];
