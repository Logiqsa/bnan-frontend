# أكاديمية بنان

واجهة منصة **أكاديمية بنان** للتعليم عن بُعد، وتقديم المناهج السعودية والمصرية والخليجية للطلاب عبر تجربة عربية وإنجليزية متجاوبة.

🌐 **الموقع الرسمي:** [bnanacademysa.com](https://bnanacademysa.com)

## عن المشروع

المشروع هو تطبيق ويب أحادي الصفحة (SPA) مبني باستخدام React وTypeScript. يضم الموقع التعريفي للأكاديمية، عرض المناهج والدورات، تسجيل الطلاب والمعلمين، بوابة الجداول والحصص، بالإضافة إلى لوحة إدارة لمتابعة المحتوى والمستخدمين والفصول وتسجيلات Zoom.

### أبرز المزايا

- دعم اللغتين العربية والإنجليزية.
- عرض المناهج والدورات وتفاصيلها.
- تسجيل الطلاب واستقبال طلبات المعلمين.
- بوابة منفصلة للطلاب والمعلمين مع صلاحيات وصول.
- إدارة الجداول والحصص والتسجيلات والفصول الافتراضية.
- تكامل مع Zoom لإدارة حسابات وحصص الفصول.
- دعم عمليات الدفع وصفحات الرجوع الخاصة بـ Tamara وPaymob.
- إدارة المحتوى القانوني وقصص النجاح والتقييمات.
- تصميم متجاوب مع تحسين بيانات SEO الأساسية.

## التقنيات المستخدمة

- [React 18](https://react.dev/) و[TypeScript](https://www.typescriptlang.org/)
- [Vite 5](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) و[shadcn/ui](https://ui.shadcn.com/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/) و[Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/) وTesting Library

## متطلبات التشغيل

- Node.js 20 (الإصدار محدد في `.nvmrc`)
- npm

## التشغيل محليًا

```bash
git clone <repository-url>
cd bnan-source-code
npm ci
npm run dev
```

بعد التشغيل، افتح [http://localhost:8080](http://localhost:8080).

> الواجهة تتصل حاليًا بخدمة الـ API على `https://api.bnanacademysa.com/api/v1`، لذلك تحتاج اتصالًا بالإنترنت لتشغيل الوظائف التي تعتمد على البيانات أو تسجيل الدخول.

## أوامر المشروع

| الأمر | الوصف |
| --- | --- |
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` | إنشاء نسخة الإنتاج داخل `dist` |
| `npm run preview` | معاينة نسخة الإنتاج محليًا |
| `npm run lint` | فحص جودة الكود باستخدام ESLint |
| `npm test` | تشغيل الاختبارات مرة واحدة |
| `npm run test:watch` | تشغيل الاختبارات في وضع المراقبة |

## بنية المشروع

```text
src/
├── admin/       # لوحة الإدارة وإدارة Zoom والفصول
├── api/         # عميل الـ API وتعريفات الطلبات والأنواع
├── assets/      # الصور والملفات المرئية
├── components/  # المكونات المشتركة ومكونات الواجهة
├── data/        # البيانات المحلية الثابتة
├── hooks/       # React hooks المخصصة
├── i18n/        # إدارة اللغة والترجمة
├── layouts/     # تخطيطات الصفحات ولوحات التحكم
├── lib/         # الأدوات والخدمات المساعدة
├── pages/       # صفحات الموقع العامة
├── portal/      # بوابة الطلاب والمعلمين
└── test/        # إعداد بيئة الاختبارات
```

## النشر على Cloudflare Pages

1. اربط المستودع بـ GitHub من **Workers & Pages** في Cloudflare.
2. اختر إعدادات البناء التالية:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `20`
3. نفّذ عملية النشر، ثم أضف الدومين من **Custom domains** عند الحاجة.

ملف `public/_redirects` يوفّر fallback لمسارات React Router، بينما يحتوي `public/_headers` على ترويسات الأمان وسياسة التخزين المؤقت.

## الـ Backend

هذا المستودع خاص بواجهة الويب فقط. خدمات المصادقة والبيانات والدفع والفصول متاحة من خلال API منفصل، ونقطة الاتصال الحالية معرفة في `src/api/client.ts`.

## المساهمة

قبل إرسال أي تغيير، تأكد من نجاح الفحص والاختبارات والبناء:

```bash
npm run lint
npm test
npm run build
```
