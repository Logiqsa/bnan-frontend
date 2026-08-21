# متطلبات Backend — لوحة تحكم محتوى اللاندينج

> على نفس نمط `WEB_API_INTEGRATE.md` و`BACKEND_WEB_REQUIREMENTS.md`. الـFrontend بيستدعي الـendpoints دي دلوقتي، لكنها لسه مش موجودة في الـbackend الحقيقي. كل المسارات مسبوقة بـ`/api/v1` وبتتبع نفس عقد الأخطاء الموجود بالفعل (`{ success:false, status:"error", code, message, errors }`).

## السياق

تمت إزالة Supabase بالكامل من الـfrontend. قسمين في الصفحة الرئيسية كانوا بيعتمدوا على بيانات ثابتة (hardcoded) أو Supabase، ودلوقتي المفروض يتغيروا من admin panel حقيقي:

1. **آراء عملائنا** (`TestimonialsSection.tsx`) — شريط صور متحرك (marquee).
2. **قصص نجاح بدأت مع بنان خطوة بخطوة** (`AudioTestimonialsSection.tsx`) — تسجيلات صوتية بأسماء.

الـFrontend بيستخدم fallback ثابت (نفس الصور/التسجيلات الحالية) لو الـendpoints دي رجّعت خطأ، عشان الموقع مايتبوظش لحد ما الـbackend يجهزها.

## المصادقة

- تسجيل دخول الأدمن بيستخدم نفس `POST /api/v1/auth/login` الموجود بالفعل، ويتأكد الفرونت إن `data.role === "admin"`.
- كل endpoints الـ`/api/v1/admin/*` تحت لازم تتطلب `Authorization: Bearer <token>` بحيث الـuser عنده role = `admin` (نفس المنطق المستخدم بالفعل في التحقق من `teacher`/`supervisor`/`admin` الموجود في مسارات تانية زي `sessions/start`).

## 1. صور آراء العملاء

### عام (بدون Authorization) — تُستخدم في الصفحة الرئيسية

```http
GET /api/v1/content/testimonial-images
```

```json
{ "success": true, "data": [ { "id": "...", "imageUrl": "https://...", "sortOrder": 0, "isActive": true } ] }
```

يرجع بس العناصر اللي `isActive: true`، مرتبة بـ`sortOrder`.

### أدمن

```http
GET    /api/v1/admin/testimonial-images
POST   /api/v1/admin/testimonial-images        (multipart/form-data)
PATCH  /api/v1/admin/testimonial-images/:id     (multipart/form-data)
DELETE /api/v1/admin/testimonial-images/:id
```

- `GET`: يرجع كل العناصر (حتى غير الفعّالة)، بنفس شكل الـResponse أعلاه.
- `POST`: بيقرأ `image` (ملف)، و`sortOrder` (اختياري، رقم) كـform fields. يرفع الصورة، وينشئ سجل جديد، ويرجع `{ success:true, data: <السجل الجديد> }`.
- `PATCH`: أي مجموعة من `image` (ملف لاستبدال الصورة)، `sortOrder`، `isActive` (`"true"`/`"false"` كنص لأنها form field). يرجع السجل بعد التحديث.
- `DELETE`: يمسح السجل والملف المرتبط به. يرجع `{ success:true }`.

## 2. قصص النجاح الصوتية

### عام (بدون Authorization)

```http
GET /api/v1/content/success-stories
```

```json
{ "success": true, "data": [ { "id": "...", "name": "أم عبدالعزيز", "audioUrl": "https://...", "sortOrder": 0, "isActive": true } ] }
```

### أدمن

```http
GET    /api/v1/admin/success-stories
POST   /api/v1/admin/success-stories        (multipart/form-data: name, audio file, sortOrder?)
PATCH  /api/v1/admin/success-stories/:id     (multipart/form-data: name?, audio file?, sortOrder?, isActive?)
DELETE /api/v1/admin/success-stories/:id
```

نفس منطق القسم الأول بالظبط، بس الحقول `name` (نص) و`audio` (ملف صوت) بدل `image`.

## ملاحظة: قسم "المناهج" (الباقات والتسجيل والدفع)

قبل إزالة Supabase، كان فيه مسار كامل في اللاندينج (اختيار المنهج → عرض الباقات والأسعار → تسجيل ودفع بإيصال) شغال بالكامل عن طريق Supabase Edge Functions. اتشال دلوقتي بالكامل من الموقع (زرار كل منهج بيوديك على واتساب مباشرة بدل الفورم القديم) لحد ما يتقرر هل هيتعمله backend حقيقي، ولو حصل ده محتاج مواصفات API منفصلة عن المستند ده.
