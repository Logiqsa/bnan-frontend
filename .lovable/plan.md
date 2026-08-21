# توحيد تسجيل ولي الأمر مع مسار "الباقات + طرق الدفع"

## الوضع الحالي
- **`ParentSignUpForm`** (نموذج التسجيل ك ولي أمر الحالي): يجمع البيانات ثم يستدعي `paymob-ksa-payment` مباشرة بمبلغ ثابت `100` بدون اختيار باقة وبدون اختيار طريقة دفع → النتيجة الصفحة في الصورة الأولى مع خطأ.
- **`LandingRegistrationForm`** (المسار الموجود فعلاً والمستخدم في تسجيل الطالب): ويزرد 5 خطوات يحتوي بالفعل على شاشة طريقة الدفع المطابقة للصورة الثانية (Paymob / تمارا) في `step === 4`، واختيار الباقة في `step === 3`، وبيُمرَّر `selected_plan_id` و `total_amount` لـ Paymob. **هذا هو ما يريده المستخدم.**

## المطلوب
عند الضغط على "تسجيل كولي أمر" في صفحة `/curricula?signup=parent`، نعرض **نفس** ويزرد `LandingRegistrationForm` (مع اختيار باقة + شاشة طريقة الدفع) بدلاً من `ParentSignUpForm` المختصر.

## الخطوات

### 1) `src/pages/AllCurricula.tsx`
- في الفرع `if (selectedCurriculum && showForm)`:
  - حذف فرع `isParentSignup ? <ParentSignUpForm /> : <LandingRegistrationForm />`.
  - استخدام `LandingRegistrationForm` دائماً، مع تمرير prop جديد `accountType="parent"` عند `isParentSignup === true`.
- منطق "اختيار الباقات أولاً" موجود فعلاً: عند اختيار منهج غير مصري يتم عرض `PackagesSection` ثم الانتقال للنموذج. نفس السلوك سيُطبَّق على ولي الأمر.
- بالنسبة للمنهج المصري: حالياً ينتقل ولي الأمر مباشرة للنموذج. نوحّده بحيث يمر بـ `PackagesSection` أيضاً، ثم النموذج، فيظهر له اختيار الباقة وطريقة الدفع.

### 2) `src/components/LandingRegistrationForm.tsx`
- إضافة prop اختياري: `accountType?: "student" | "parent"` (default `"student"`).
- عندما `accountType === "parent"`:
  - تعديل عناوين `step 1` و `step 3` لتعكس "ولي الأمر" و "بيانات الأطفال" (نفس الحقول، تغيير نصوص فقط).
  - حفظ في `registration_requests` بنفس الشكل الحالي (الحقول `parent_name/parent_email/parent_phone/students[]` متطابقة لكلا المسارين، فلا حاجة لتغيير في الـ DB).
  - السماح بإضافة أكثر من طفل في `step 3` (الويزرد يدعم ذلك أصلاً عبر array `students`).

### 3) `src/components/auth/ParentSignUpForm.tsx`
- حذف الملف (لم يعد مستخدماً) أو إبقاؤه كبديل قديم غير مرجّع.

## ملاحظات
- لا تغييرات على Edge Functions ولا على قاعدة البيانات. منطق الدفع الصحيح (مع `selected_plan_id` ومبلغ حقيقي) مطبَّق فعلاً في `LandingRegistrationForm`.
- نفس الكومبوننت سيعرض شاشة "طريقة الدفع — Paymob / تمارا" المطابقة لصورة المستخدم.
- مشكلة "تعذر تجهيز جلسة الدفع" التي ظهرت في المحاولة السابقة منفصلة وسببها مبلغ `100` صغير + إعدادات Paymob؛ بعد المرور بالباقة سيُرسل المبلغ الصحيح.
