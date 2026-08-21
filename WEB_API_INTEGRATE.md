# Bnan Web API Integration Contract

> هذا التقرير مبني على تتبع التنفيذ الحالي في المشروع بتاريخ 2026-08-15. لا يحتوي على Endpoints مفترضة، ولا يقترح تغييرًا على الـBusiness Logic المنفذ. جميع المسارات أدناه مسبوقة بـ`/api/v1`.

## قواعد مشتركة

- الطلبات المحمية تستخدم `Authorization: Bearer <access-token>`.
- Access token هو JWT يحمل `{ id, tokenType: "access", iat, exp }` وموقّع بـ`JWT_SECRET`. مدة الصلاحية تأتي من `JWT_EXPIRES_IN`.
- Refresh token يحمل `{ id, tokenType: "refresh", jti, iat, exp }`، ويستخدم `JWT_REFRESH_SECRET` أو `JWT_SECRET` كـfallback. المدة من `JWT_REFRESH_EXPIRES_IN` أو `30d`.
- لا توجد Cookies للجلسة في التنفيذ؛ التوكنات داخل JSON.
- يمكن إرسال `lang: ar` لاختيار رسالة الخطأ المترجمة. الـFrontend يجب أن يعتمد على `code` لا على `message`.
- شكل الخطأ التشغيلي في production:

```json
{
  "success": false,
  "status": "error",
  "code": "ACTION_DENIED",
  "message": "<localized message>",
  "errors": null
}
```

> في development يعيد الـglobal error handler شكلاً مختلفًا ولا يعيد `code` صراحة. يجب اختبار عقد الويب في بيئة production/staging ذات `NODE_ENV` مناسب.

## 1. Authentication

### Teacher registration

```http
POST /api/v1/auth/register-teacher
Content-Type: multipart/form-data
```

لا يحتاج Authorization. الـroute يشغّل `uploadTeacherFiles` ثم `teacherService.registerTeacher` داخل Mongo transaction.

الحقول التي يقرأها التنفيذ:

| النوع | الحقول |
|---|---|
| User | `fullName`, `email`, `password` |
| Contact/location | `phone`, `whatsapp`, `nationality`, `country`, `city` |
| Education | `degree`, `specialization`, `institutionName`, `graduationYear`, `graduationGrade` |
| Capabilities | `hasTeachingExperience`, `hasOnlineTeachingExperience`, `availableHoursPerWeek`, `computerSkillLevel`, `hasLaptop`, `hasStableInternet`, `hasGoodCamera`, `hasMicrophone`, `canProvideDemoSession` |
| Application | `introVideoUrl`, `joiningReason`, `weakStudentHandling`, `termsAccepted` |
| Curricula | واحد من `curriculums`, `curriculumIds`, `curriculumId`, `curriculum`; يقبل array أو JSON string أو comma-separated string |
| Grade/subjects | `teacherAssignments` كـarray أو JSON string، وكل عنصر `{ grade, subjects: [] }` |
| Files | `cv`, `certificate`, `identityDocument` |

مثال واقعي مطابق للحقول التي يقرأها الكود:

```text
fullName=Ahmed Ali
email=ahmed@example.com
password=Password123
phone=01000000000
curriculums=["<egyptianCurriculumId>","<gulfCurriculumId>"]
teacherAssignments=[{"grade":"<gradeId>","subjects":["<subjectId>"]}]
termsAccepted=true
cv=<file>
certificate=<file>
identityDocument=<file>
```

نجاح التسجيل `201`:

```json
{
  "success": true,
  "token": "<access-jwt>",
  "refreshToken": "<refresh-jwt>",
  "data": {
    "id": "<teacherUserId>",
    "fullName": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "teacher",
    "status": "active",
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z"
  }
}
```

مهم: الاستجابة تعيد **User** فقط، ولا تعيد Teacher profile أو `teacher.status` أو `registrationModes`. ينشأ ملف المعلم بحالة `pending`، بينما ينشأ الـUser افتراضيًا بحالة `active`، ولذلك يحصل المتقدم على token فورًا. مع ذلك، Login اللاحق يرفضه بـ`TEACHER_NOT_APPROVED` ما دام ملف المعلم غير `approved`.

#### Approval وحالات المعلم

- `Teacher.status`: `pending | approved | rejected`، والافتراضي `pending`.
- `User.status`: `active | inactive | blocked`، والافتراضي عند التسجيل `active`.
- قرار Admin الفعلي هو `PATCH /teachers/:id/status` مع `{ "status": "approved" | "rejected" }`، وهو ليس جزءًا من Web Portal للمعلم.
- approval يضبط `Teacher.status=approved` و`User.status=active`.
- rejection يضبط `Teacher.status=rejected` و`User.status=inactive`.
- لا يوجد انتقال Admin في هذا المسار يعيد المعلم إلى `pending`.
- المعلم pending ذو User active: Login يرجع `403 TEACHER_NOT_APPROVED`.
- المعلم rejected: يفشل أولًا عند فحص User status ويرجع `403 ACCOUNT_DEACTIVATED`، وليس `TEACHER_NOT_APPROVED`.
- User inactive أو blocked: `403 ACCOUNT_DEACTIVATED`.
- إذا فُقد Teacher profile مع بقاء User بدور teacher وactive، فإن Login الحالي لا يرفضه؛ يعيد نجاحًا و`registrationModes: []` لأن شرط approval يعمل فقط عند وجود profile.

`BACKEND GAP`: token التسجيل الصادر للمعلم pending يعمل فورًا مع `protect` و`restrictTo('teacher')` لأنهما يفحصان User status/role فقط ولا يعيدان فحص `Teacher.status`. بعض الخدمات الحساسة مثل Start تعيد فحص `approved`، لكن الحماية ليست مركزية على كل Teacher endpoints.

أخطاء التسجيل المباشرة ذات الصلة: `INVALID_CURRICULUMS` (400)، `CURRICULUM_NOT_FOUND` (404)، وأخطاء Mongoose validation مثل `VALIDATION_ERROR` مع `errors` مفصلة، و`EMAIL_ALREADY_EXISTS` (400). كما قد يظهر خطأ JSON أصلي غير تشغيلي إذا كان `teacherAssignments` نص JSON غير صالح، لأن parse هذا الحقل ليس ملفوفًا بـAppError.

### Unified login: Teacher and Student

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

لا يوجد Endpoint منفصل للطالب المصري أو الخليجي أو المعلم. Email يُطبّع بـ`trim().toLowerCase()` ثم يفحص password.

#### Teacher login success

```json
{
  "success": true,
  "token": "<access-jwt>",
  "refreshToken": "<refresh-jwt>",
  "data": {
    "id": "<userId>",
    "fullName": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "teacher",
    "status": "active",
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z",
    "registrationModes": ["egyptian", "gulf"]
  }
}
```

- الـFrontend يعرف أنه Teacher من `data.role === "teacher"`، وليس من JWT؛ الـJWT لا يحمل role.
- `registrationModes` تُستخرج من **التكليفات النشطة** `ClassroomSubject` والفصول النشطة ومناهجها، وقد تكون `[]` أو `['egyptian']` أو `['gulf']` أو الاثنين. لا يصح افتراض منهج واحد من Teacher profile.

#### Student login success

```json
{
  "success": true,
  "token": "<access-jwt>",
  "refreshToken": "<refresh-jwt>",
  "data": {
    "id": "<studentUserId>",
    "fullName": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "status": "active",
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z",
    "registrationMode": "egyptian"
  }
}
```

- الفرق المصري/الخليجي ليس في login path بل في `Student.curriculum.registrationMode`.
- الـFrontend يعرف النوع من `data.registrationMode === 'egyptian' | 'gulf'`.
- login لا يعيد curriculum id/name ولا `registrationStatus`، بل `registrationMode` فقط.
- حالات `Student.registrationStatus`: `pending | approved | rejected`.
- المصري pending مع User غير active: `403 REGISTRATION_PENDING`.
- أي Student آخر User status غير active، بما فيه rejected: `403 ACCOUNT_DEACTIVATED`.
- إذا كان User active، لا يمنع Login بناءً على `Student.registrationStatus`؛ المنع الخاص بالطالب pending مشروط أيضًا بأن User غير active والمنهج مصري.

#### Login errors الفعلية

| HTTP | code | الحالة |
|---:|---|---|
| 400 | `EMPTY_LOGIN_DATA` | email أو password غير موجود |
| 401 | `INCORRECT_LOGIN_DATA` | user غير موجود أو password خطأ |
| 403 | `REGISTRATION_PENDING` | طالب مصري pending وUser غير active |
| 403 | `ACCOUNT_DEACTIVATED` | User inactive أو blocked، ويشمل المعلم rejected |
| 403 | `TEACHER_NOT_APPROVED` | User المعلم active لكن Teacher pending/rejected |

### Refresh token

```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{ "refreshToken": "<refresh-jwt>" }
```

نجاح `200`:

```json
{
  "success": true,
  "token": "<new-access-jwt>",
  "refreshToken": "<new-refresh-jwt>"
}
```

الأخطاء: `REFRESH_TOKEN_REQUIRED` (400)، `REFRESH_TOKEN_EXPIRED` (401)، `INVALID_REFRESH_TOKEN` (401)، `USER_DOES_NOT_EXIST` (401)، `PASSWORD_HAS_CHANGED` (401)، `ACCOUNT_DEACTIVATED` (403).

### Logout

`MISSING API`

لا يوجد server-side token revocation/logout. التنفيذ الحالي للويب هو حذف access/refresh tokens محليًا. التوكن القديم يبقى صالحًا حتى expiry أو تغيير password/تعطيل الحساب.

## 2. Current User / Profile

```http
GET /api/v1/users/me
Authorization: Bearer <access-token>
```

المسار موجود ومحمي، لكنه يعيد Profile مختلف الشكل حسب الدور وليس Current User contract موحدًا.

### Student response

```json
{
  "success": true,
  "data": {
    "id": "<studentProfileId>",
    "user": {
      "id": "<userId>",
      "fullName": "Student Name",
      "email": "student@example.com",
      "role": "student",
      "status": "active"
    },
    "parent": { "id": "<parentId>", "phone": "..." },
    "curriculum": { "id": "<curriculumId>", "name": "Egyptian" },
    "grade": { "id": "<gradeId>", "name": "Grade 10" },
    "subjects": [],
    "registrationStatus": "approved"
  }
}
```

الفعل الحالي يملأ curriculum بـ`name` فقط؛ لذلك `registrationMode` **غير موجود** هنا. استخدم قيمة login، أو:

`MISSING API`: current-user response موحّد يضمن `userId`, `role`, `status`, profile status، و`curriculum.registrationMode`.

### Teacher response

```json
{
  "success": true,
  "data": {
    "user": { "id": "<userId>", "fullName": "Ahmed Ali", "email": "ahmed@example.com" },
    "phone": "01000000000",
    "specialization": "Mathematics",
    "curriculums": [{ "id": "<curriculumId>", "name": "Egyptian" }],
    "grades": 2,
    "subjects": [{ "id": "<subjectId>", "name": "Math" }],
    "classrooms": 3,
    "students": 25
  }
}
```

ملاحظات فعلية: `grades` عدد لا قائمة، و`classrooms` عدد، وTeacher `status` غير محدد في select، وUser `role/status` غير محددين، وcurriculums لا تعيد `registrationMode`. لذلك لا يعوض هذا endpoint `registrationModes` القادمة من Login.

أخطاء الحماية/profile: `NOT_LOGGED_IN` (401)، `INVALID_TOKEN` (401)، `TOKEN_EXPIRED` (401)، `USER_DOES_NOT_EXIST` (401)، `PASSWORD_HAS_CHANGED` (401)، `ACCOUNT_DEACTIVATED` (403)، `PROFILE_NOT_FOUND` (404).

## 3. Teacher Schedule

لا يوجد Endpoint واحد يوحّد المصري والخليجي. يجب على Teacher Portal طلب الاثنين ثم توحيدهما في الـFrontend اعتمادًا على `registrationModes`:

```http
GET /api/v1/egyptianSchedules/mySchedule?weekStart=YYYY-MM-DD
GET /api/v1/gulfSchedules/mySchedule?weekStart=YYYY-MM-DD
```

كلاهما Bearer auth وrole `teacher` مسموح. كلاهما يشتق Teacher profile من `req.user` ولا يقبل teacherId؛ لذلك لا يستطيع المعلم طلب جدول معلم آخر بهذه المسارات.

### Egyptian teacher schedule

الاستجابة `200`:

```json
{
  "success": true,
  "results": 1,
  "data": {
    "weekStart": "2026-08-15",
    "weekEnd": "2026-08-21",
    "currentWeek": 4,
    "currentWeekStart": "2026-08-15",
    "timezone": "Africa/Cairo",
    "days": [
      {
        "date": "2026-08-16",
        "dayName": "sunday",
        "lessons": [
          {
            "id": "<lessonId>",
            "date": "2026-08-16",
            "startTime": "18:00",
            "scheduledAt": "2026-08-16T15:00:00.000Z",
            "classroom": { "id": "<classroomId>", "name": "Class A" },
            "classroomSubjectId": "<classroomSubjectId>",
            "subject": { "id": "<subjectId>", "name": "Math" },
            "teacher": {
              "id": "<teacherId>",
              "userId": "<teacherUserId>",
              "name": "Ahmed Ali",
              "profileImage": null
            },
            "activeSession": {
              "id": "<sessionId>",
              "status": "live",
              "canJoin": true
            }
          }
        ]
      }
    ]
  }
}
```

- يعيد فقط الدروس التي `ClassroomSubject` الخاص بها assigned للمعلم الحالي و`isActive:true`، عبر أي عدد من الفصول والمواد.
- `weekStart` الاختياري يمكن أن يكون أي تاريخ في الأسبوع؛ الخدمة ترجعه إلى السبت.
- `activeSession` يُربط بالدرس فقط إذا كان تاريخ الدرس هو تاريخ اليوم في القاهرة، وبناءً على `classroomSubject`.
- الحالات التي تعد active: `starting`, `live`, `awaiting_zoom_end`; `canJoin=true` فقط في `starting | live`.
- لا يعيد curriculum في كل lesson، لكن هذا endpoint نفسه مصري قطعًا.
- لا يعيد `endTime`, `duration`, meetingLink, zoomMeetingId، أو flags مستقلة `upcoming/live/ended/canStartNow`.
- لا توجد Session `scheduled` مولّدة من الجدول؛ الدرس والـSession كيانان منفصلان.

### Gulf teacher schedule

الاستجابة `200`:

```json
{
  "success": true,
  "results": 1,
  "data": {
    "currentWeek": 4,
    "currentWeekStart": "2026-08-15",
    "weekStart": "2026-08-15",
    "weekEnd": "2026-08-21",
    "timezone": "Africa/Cairo",
    "students": [],
    "classrooms": [
      {
        "id": "<classroomId>",
        "name": "Gulf Class A",
        "grade": { "id": "<gradeId>", "name": "Grade 10" },
        "curriculum": { "id": "<curriculumId>", "name": "Gulf" },
        "subject": { "id": "<subjectId>", "name": "Math" },
        "classroomSubject": "<classroomSubjectId>",
        "schedule": {
          "id": "<scheduleId>",
          "classroomSubject": "<classroomSubjectId>",
          "entries": [
            { "day": "sunday", "startTime": "18:00" },
            { "day": "tuesday", "startTime": "18:00" }
          ],
          "isActive": true,
          "createdAt": "2026-08-01T10:00:00.000Z",
          "updatedAt": "2026-08-10T10:00:00.000Z"
        }
      }
    ]
  }
}
```

- الفصول مصفّاة إلى curriculum `registrationMode=gulf`، لكن response يملأ curriculum بـ`name` فقط ولا يعيد `registrationMode`.
- `entries` أسبوعية ولا تحتوي date؛ الـFrontend يستطيع إسقاطها على `weekStart/weekEnd` للعرض فقط.
- لا توجد teacher object في العنصر، ولا `endTime`, `duration`, meeting info، session status، `upcoming/live/ended/canStartNow`.
- رغم حساب metadata الأسبوع، `weekStart` لا يفلتر/يولد occurrences؛ entries هي نفس القاعدة الأسبوعية.

### Normalization المقترح في الويب دون تغيير Backend

يمكن توحيد العناصر محليًا إلى `{ registrationMode, classroom, classroomSubjectId, subject, day, date, startTime, scheduledAt, teacher, activeSession }` مع وضع `registrationMode` من endpoint المستخدم. لكن الحقول غير الموجودة (`endTime`, duration، Gulf live status، canStartNow) يجب أن تبقى `null/unknown` ولا تُخترع.

## 4. Teacher Start Lesson

```http
POST /api/v1/classrooms/:classroomId/sessions/start
Authorization: Bearer <teacher-access-token>
Content-Type: application/json

{ "subjectId": "<subjectId>" }
```

- roles المسموحة فعليًا: `teacher`, `admin`, `supervisor`.
- للمعلم: `subjectId` يمكن حذفه فقط عندما يملك تكليفًا نشطًا واحدًا بالضبط داخل الفصل؛ وإلا `SUBJECT_REQUIRED`.
- الخدمة تتحقق من Classroom موجود ونشط، ومن وجود `meetingLink` و`zoomMeetingId`، ومن Teacher profile، ومن `ClassroomSubject` نشط يطابق نفس teacher/classroom/subject، ومن Teacher `approved`، ومن Subject نشط.
- Teacher لا يستطيع بدء مادة أو فصل غير assigned له.
- يوجد unique partial index يمنع أكثر من Session ذات `activeOccurrence:true` لكل Classroom.

نجاح `201`:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "<sessionId>",
      "classroomSubject": "<populated-or-id>",
      "classroom": "<classroomId>",
      "subject": "<subjectId>",
      "teacher": "<teacherId>",
      "title": "<generated title>",
      "startAt": "2026-08-15T10:00:00.000Z",
      "status": "starting",
      "zoomMeetingId": "<zoomMeetingId>",
      "activeOccurrence": true,
      "startedBy": "<userId>"
    },
    "meetingLink": "https://zoom.us/j/..."
  }
}
```

### Time enforcement الفعلي

`BACKEND GAP: START LESSON TIME VALIDATION`

الـStart implementation لا يقرأ EgyptianSchedule أو GulfSchedule إطلاقًا، ولا يستقبل lesson id/date، ولا يفحص اليوم أو الوقت أو timezone أو نافذة مبكرة/متأخرة أو نهاية الحصة. `startAt` يساوي `new Date()` لحظة الضغط. النتيجة:

- يمكن البدء قبل الموعد بأي مدة، بعد الموعد بأي مدة، في يوم آخر، أو بعد انتهاء الموعد المفترض.
- لا يوجد `TOO_EARLY_TO_START` أو `SESSION_ENDED` في هذا flow.
- لا توجد duration/end time في نماذج الجدول أصلًا كي يُحسب انتهاء الحصة.
- الضغط مرتين: الأول `201`، والثاني يصطدم بالـunique index ويعود `409 CLASSROOM_SESSION_ALREADY_ACTIVE`.
- بعد إنهاء الـSession وإزالة `activeOccurrence` بواسطة webhook، يمكن Start من جديد بلا علاقة بالجدول.

أقل تعديل Backend موصى به لاحقًا: اجعل Start يستقبل معرف occurrence غير قابل للالتباس (للجدول المصري `lessonId` + date الموجودان بالفعل؛ وللخليجي يلزم occurrence date مع `classroomSubjectId`/slot)، وحوّل slot بتوقيت `Africa/Cairo` إلى UTC داخل الخدمة، وأضف duration/end-time رسميًا، ثم ارفض خارج نافذة محددة بوضوح (مثلاً configurable minutes قبل البداية وحتى نهاية occurrence)، مع index/idempotency مرتبط بالـoccurrence وأكواد ثابتة. لا يكفي إرسال `subjectId` لأن المادة قد تتكرر في الأسبوع.

### Zoom behavior والرابط

- Start **لا ينشئ Zoom meeting** ولا يستدعي Zoom API. يستخدم meeting متكرر موجود مسبقًا على Classroom.
- إنشاء Classroom هو الذي يستدعي Zoom ثم يخزن `zoomMeeting.id` في `zoomMeetingId` و`zoomMeeting.join_url` في `meetingLink`.
- الاستجابة تعيد Classroom `meetingLink`، أي **`join_url`**، وليس `start_url`.
- لا يوجد `start_url` محفوظ أو مولّد في المشروع. لذلك لا يوجد عقد حالي يضمن فتح المعلم للاجتماع كـhost. هذه فجوة حرجة في Teacher web start flow.
- `join_url` ثابت نسبيًا للاجتماع المتكرر ولا يحمل صلاحيات host؛ اعتبارات صلاحية `start_url` لا تنطبق لأنه غير مستخدم أصلًا. يجب عدم كشف `meetingLink` إلا عبر endpoints المحمية الموجودة.
- Start ينشئ Session بحالة `starting`. Zoom webhook `meeting.started` يضبط `actualStartedAt` ويحوّل `starting -> live`.

أخطاء Start الفعلية:

| HTTP | code |
|---:|---|
| 400 | `SUBJECT_REQUIRED` |
| 400 | `CLASSROOM_INACTIVE` |
| 400 | `CLASSROOM_ZOOM_NOT_CONFIGURED` |
| 401 | أخطاء auth المشتركة |
| 403 | `ACTION_DENIED` |
| 403 | `TEACHER_NOT_ASSIGNED_TO_SUBJECT` |
| 403 | `TEACHER_NOT_APPROVED` |
| 404 | `CLASSROOM_NOT_FOUND` |
| 404 | `SUBJECT_NOT_FOUND` |
| 404 | `TEACHER_NOT_FOUND` |
| 409 | `CLASSROOM_SESSION_ALREADY_ACTIVE` |

## 5. Student Egyptian Schedule

```http
GET /api/v1/egyptianSchedules/mySchedule?weekStart=YYYY-MM-DD
Authorization: Bearer <student-access-token>
```

هذا هو endpoint الرقمي الحالي للطالب المصري. يحدد Student من token ثم يجلب فقط `ClassroomEnrollment.status=approved`. إذا أرسل الطالب `studentId` مختلفًا عن ملفه يرجع `ACTION_DENIED`.

شكل response هو نفس Egyptian teacher schedule أعلاه، ويشمل classroom، subject، teacher، date، dayName، startTime، `scheduledAt` UTC، و`activeSession {id,status,canJoin}`. لا يعيد endTime أو meetingLink. لا يعيد curriculum/registrationMode داخل lesson، لكن endpoint مصري فقط.

ملاحظة مهمة: route لا يعيد schedule image القديم؛ التنفيذ الحالي لـ`getMySchedule` يستدعي الـdigital week service ويعيد `days`.

## 6. Student Join Live Lesson

### Source of Truth

المصدر الفعلي هو `Session` في MongoDB، لا ساعة الـFrontend:

- Start ينشئ Session فورًا: `status=starting`, `activeOccurrence=true`.
- Zoom `meeting.started` webhook يضبط `status=live` و`actualStartedAt`.
- طلب End يضبط `status=awaiting_zoom_end`.
- Zoom `meeting.ended` webhook يضبط `status=ended`, `actualEndedAt` ويحذف/يعطل `activeOccurrence`، ثم تبدأ معالجة التقرير/التسجيل.
- Egyptian schedule يضمّن active session لدرس اليوم فقط.
- Gulf schedule لا يضمّن Session status.

### Inspect active session

```http
GET /api/v1/classrooms/:classroomId/sessions/active
Authorization: Bearer <student-access-token>
```

يعيد `200 { "success": true, "data": null }` إن لم توجد Session فعالة. للطالب لا يعيد meetingLink:

```json
{
  "success": true,
  "data": {
    "sessionId": "<sessionId>",
    "title": "Math | ...",
    "status": "live",
    "subject": { "id": "<subjectId>", "name": "Math" },
    "teacher": {
      "id": "<teacherId>",
      "userId": "<teacherUserId>",
      "fullName": "Ahmed Ali"
    },
    "startAt": "2026-08-15T10:00:00.000Z"
  }
}
```

### Join endpoint

```http
GET /api/v1/classrooms/:classroomId/sessions/active/join
Authorization: Bearer <student-access-token>
```

نجاح `200` يعيد نفس الشكل مع `meetingLink`. الخدمة تتحقق أن الدور Student وأن له `ClassroomEnrollment` بحالة `approved` في الفصل قبل جلب الرابط.

إذا لم توجد Session أو كانت ليست `starting|live`: `404 SESSION_NOT_ACTIVE`. إذا لم يوجد الرابط: `409 CLASSROOM_ZOOM_NOT_CONFIGURED`. فصل غير مسجل: `403 ACTION_DENIED`.

### دلالة الحالات للويب

- `activeSession=null`: لا توجد حصة بدأت في Backend؛ اعرض «الحصة لم تبدأ بعد» للموعد المستقبلي. النظام لا يوفر status خاصًا يميز تلقائيًا «انتهت الحصة» عن «لم تبدأ»؛ يمكن للواجهة عرض وصف الوقت، لكن قرار الدخول يبقى من Backend.
- `starting`: التنفيذ الحالي يعتبرها joinable (`canJoin=true`) حتى قبل تأكيد Zoom webhook.
- `live`: Zoom أكد `meeting.started`، وهي أقوى دلالة فعلية على live.
- `awaiting_zoom_end`: Session ما زالت active لكن غير قابلة للدخول.
- `ended`: لا تظهر كـactive؛ Join يرجع `SESSION_NOT_ACTIVE`.

`BACKEND GAP`: إذا كان شرط المنتج هو «لا يدخل الطالب إلا بعد أن يبدأ Zoom فعليًا»، فالتنفيذ الحالي لا يحققه لأن `starting` joinable. أقل تعديل هو جعل JOINABLE_STATUSES=`['live']`، مع إبقاء `starting` حالة انتظار، أو تعريف semantics مقصودة صراحة.

## 7. Real-time / Refresh

Socket.IO موجود على نفس HTTP server، CORS الحالي `origin: '*'`. المصادقة:

```js
io({ auth: { token: accessToken } })
```

بعد التحقق من JWT وUser، السيرفر يضم socket تلقائيًا إلى room:

```text
user_<userId>
```

Socket auth يتحقق من توقيع access token ووجود User، لكنه لا يفحص `User.status` ولا `changedPasswordAfter`. لذلك token قديم لمستخدم عُطّل أو غيّر password يمكنه الاتصال بالـsocket حتى انتهاء JWT؛ هذه فجوة عن حماية REST.

عند Start، نظام notifications ينشئ `CLASS_STARTED` لكل Teacher والطلاب المسجلين approved وأولياء أمورهم، ثم socket channel يرسل:

```text
event: notification
room: user_<recipientUserId>
```

Payload فعلي نموذجي:

```json
{
  "id": "<notificationId>",
  "type": "classroom",
  "key": "CLASS_STARTED",
  "title": "<localized title>",
  "body": "<localized body>",
  "resource": { "id": "<sessionId>", "model": "Session" },
  "navigation": { "screen": "active_session", "params": { "sessionId": "..." } },
  "data": {
    "sessionId": "<sessionId>",
    "classroomId": "<classroomId>",
    "subjectName": "Math",
    "meetingLink": "https://zoom.us/j/...",
    "startAt": "2026-08-15T10:00:00.000Z"
  },
  "isRead": false,
  "status": "unread",
  "readAt": null,
  "createdAt": "2026-08-15T10:00:00.000Z"
}
```

تحذير أمني: notification `CLASS_STARTED` الحالي يضمّن `meetingLink` لجميع recipients، بما فيهم parent، بينما active-session endpoint يتعمد حجبه عن parent. كما يصل link للطلاب المسجلين في الفصل، وهو access scope صحيح، لكن الأفضل عدم استخدام notification payload كرابط دخول وتوجيه الطالب دائمًا إلى Join endpoint.

لا يوجد event مستقل باسم `teacherStartedLesson` ولا Classroom session room. أفضل flow حالي للويب: استمع إلى `notification` واطلب refetch لـschedule أو `/sessions/active` عند `payload.key==='CLASS_STARTED'`، مع refetch عند focus/reconnect وpolling خفيف أثناء `starting/awaiting_zoom_end`. لا تعتمد على socket وحده لأنه delivery غير مضمون ولأن duplicate notification قد يمنع إعادة emit.

## 8. Authorization & Security Audit

### Teacher

| requirement | الحالة الفعلية |
|---|---|
| لا يرى جدول Teacher آخر | مدعوم في `/egyptianSchedules/mySchedule` و`/gulfSchedules/mySchedule`: الهوية من token والتكليفات النشطة |
| لا يبدأ فصلًا غير مسؤول عنه | مدعوم للمعلم عبر `assertTeacherClassroomAccess` |
| لا يبدأ مادة غير assigned | مدعوم عند إرسال subjectId؛ وإن حُذف لا يسمح إلا بتكليف واحد |
| Teacher approved فقط | Start يتحقق من `Teacher.status=approved`، وLogin يمنع غير approved |
| منع Teacher pending من كل teacher APIs | غير مدعوم مركزيًا؛ token التسجيل صالح و`protect/restrictTo` لا يفحصان Teacher status |
| لا يبدأ خارج الموعد | غير مدعوم إطلاقًا |
| يحصل على host URL | غير مدعوم؛ يعاد Zoom `join_url` |

### Student

| requirement | الحالة الفعلية |
|---|---|
| لا يرى جدول طالب آخر | مدعوم للطالب؛ `studentId` المخالف يرفض |
| لا يرى فصلًا غير مسجل | schedule يجلب enrollments approved فقط |
| لا يحصل على Zoom URL لفصل غير مسجل | مدعوم في Join عبر approved enrollment |
| لا يحصل على URL قبل Session | مدعوم جزئيًا؛ يلزم active Session لكن `starting` مقبولة قبل Zoom `meeting.started` |
| لا يحصل Parent على Join link | active/join محصور Student، وactive inspect يحجب link عن Parent؛ لكن CLASS_STARTED socket notification يضم الرابط للParent، وهي فجوة |

### Endpoint-level caveats

- `GET /gulfSchedules/classroom/:classroomId` لا يضع `restrictTo`، لكنه يستدعي `validateClassroomAccess` في الخدمة، لذا ما زال محميًا حسب الفصل.
- `GET /classrooms/:id` وغيره ليس موضوع جدول الطالب؛ routes تقيد الأدوار ولا تسمح Student.
- `zoomMeetingId` لا يعود في schedule/join contract، لكنه موجود في Start session response داخل session. لا يحتاجه الويب لفتح Zoom، ويفضل ألا يعتمد عليه.

## 9. Frontend Error Contract

الأكواد التالية موجودة فعليًا في المسارات اللازمة للويب:

| HTTP | code | الاستخدام |
|---:|---|---|
| 400 | `EMPTY_LOGIN_DATA` | Login body ناقص |
| 400 | `INVALID_CURRICULUMS` | Teacher registration curricula غير صالحة |
| 400 | `VALIDATION_ERROR` | Mongoose validation؛ راجع `errors` |
| 400 | `EMAIL_ALREADY_EXISTS` | email مكرر |
| 400 | `REFRESH_TOKEN_REQUIRED` | refresh body ناقص |
| 400 | `INVALID_WEEK_START` | `weekStart` غير صالح |
| 400 | `SUBJECT_REQUIRED` | Start يحتاج subjectId |
| 400 | `CLASSROOM_INACTIVE` | Start لفصل inactive |
| 400 | `CLASSROOM_ZOOM_NOT_CONFIGURED` | Start بلا Zoom config |
| 400 | `INVALID_ID` | ObjectId غير صالح في بعض access paths |
| 401 | `INCORRECT_LOGIN_DATA` | credentials خاطئة |
| 401 | `NOT_LOGGED_IN` | Bearer token غير موجود |
| 401 | `INVALID_TOKEN` | access token غير صالح/نوعه خطأ |
| 401 | `TOKEN_EXPIRED` | access token منتهي |
| 401 | `REFRESH_TOKEN_EXPIRED` | refresh token منتهي |
| 401 | `INVALID_REFRESH_TOKEN` | refresh غير صالح |
| 401 | `USER_DOES_NOT_EXIST` | user الخاص بالتوكن غير موجود |
| 401 | `PASSWORD_HAS_CHANGED` | password تغير بعد إصدار التوكن |
| 403 | `ACCOUNT_DEACTIVATED` | User inactive/blocked |
| 403 | `REGISTRATION_PENDING` | Student Egyptian pending وفق شرط login المذكور |
| 403 | `TEACHER_NOT_APPROVED` | Teacher غير approved |
| 403 | `ACTION_DENIED` | role أو ownership/enrollment مرفوض |
| 403 | `TEACHER_NOT_ASSIGNED_TO_SUBJECT` | Start لمادة غير assigned |
| 404 | `PROFILE_NOT_FOUND` | `/users/me` بلا profile |
| 404 | `STUDENT_PROFILE_NOT_FOUND` | schedule بلا Student profile |
| 404 | `TEACHER_PROFILE_NOT_FOUND` | schedule بلا Teacher profile |
| 404 | `CLASSROOM_NOT_FOUND` | Start classroom غير موجود |
| 404 | `SUBJECT_NOT_FOUND` | Start subject غير موجود/inactive |
| 404 | `TEACHER_NOT_FOUND` | Teacher access profile غير موجود |
| 404 | `SESSION_NOT_ACTIVE` | Join لا يجد starting/live Session |
| 409 | `CLASSROOM_SESSION_ALREADY_ACTIVE` | Start مكرر/Session أخرى تحجز الفصل |
| 409 | `CLASSROOM_ZOOM_NOT_CONFIGURED` | Join وجد Session لكن لا رابط |

### RECOMMENDED BACKEND ADDITIONS

هذه الأكواد **غير موجودة حاليًا** في Start/Join flow ولا يجوز للـFrontend توقعها الآن:

- `TOO_EARLY_TO_START`
- `START_WINDOW_CLOSED` أو `SESSION_ENDED` لرفض Start المتأخر
- `SCHEDULE_OCCURRENCE_NOT_FOUND`
- `SESSION_NOT_STARTED` كتمييز صريح عن ended
- code صريح لحالة `starting` عندما يشترط المنتج Zoom live فعليًا
- Logout/revocation contract

## FRONTEND INTEGRATION CHEAT SHEET

### Teacher Signup

- METHOD: `POST`
- PATH: `/api/v1/auth/register-teacher`
- AUTH: none
- BODY: `multipart/form-data`؛ الحقول والملفات موثقة أعلاه
- SUCCESS RESPONSE: `201` + `token`, `refreshToken`, User في `data` (لا يعيد Teacher status)
- ERRORS: `INVALID_CURRICULUMS`, `CURRICULUM_NOT_FOUND`, `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS`

### Login

- METHOD: `POST`
- PATH: `/api/v1/auth/login`
- AUTH: none
- BODY: `{ email, password }`
- SUCCESS RESPONSE: `200` + token pair + User؛ Student `registrationMode`، Teacher `registrationModes[]`
- ERRORS: `EMPTY_LOGIN_DATA`, `INCORRECT_LOGIN_DATA`, `REGISTRATION_PENDING`, `ACCOUNT_DEACTIVATED`, `TEACHER_NOT_APPROVED`

### Current User

- METHOD: `GET`
- PATH: `/api/v1/users/me`
- AUTH: Bearer access token
- BODY: none
- SUCCESS RESPONSE: `200 {success,data:<role-specific profile>}`
- ERRORS: auth errors, `PROFILE_NOT_FOUND`
- GAP: ليس عقدًا موحدًا ولا يعيد registrationMode/status اللازمة دائمًا

### Teacher Schedule

- METHOD: `GET` + `GET`
- PATH: `/api/v1/egyptianSchedules/mySchedule?weekStart=YYYY-MM-DD` و`/api/v1/gulfSchedules/mySchedule?weekStart=YYYY-MM-DD`
- AUTH: Teacher Bearer token
- BODY: none
- SUCCESS RESPONSE: Egyptian `days[].lessons[]`; Gulf `classrooms[].schedule.entries[]`
- ERRORS: auth errors, `INVALID_WEEK_START`, profile errors

### Start Lesson

- METHOD: `POST`
- PATH: `/api/v1/classrooms/:classroomId/sessions/start`
- AUTH: Teacher Bearer token
- BODY: `{ "subjectId": "<subjectId>" }`؛ يمكن حذفه فقط لتكليف واحد
- SUCCESS RESPONSE: `201 {success,data:{session,meetingLink}}`
- ERRORS: `SUBJECT_REQUIRED`, `CLASSROOM_INACTIVE`, `CLASSROOM_ZOOM_NOT_CONFIGURED`, `ACTION_DENIED`, `TEACHER_NOT_ASSIGNED_TO_SUBJECT`, `TEACHER_NOT_APPROVED`, `CLASSROOM_NOT_FOUND`, `SUBJECT_NOT_FOUND`, `CLASSROOM_SESSION_ALREADY_ACTIVE`

### Egyptian Student Schedule

- METHOD: `GET`
- PATH: `/api/v1/egyptianSchedules/mySchedule?weekStart=YYYY-MM-DD`
- AUTH: Student Bearer token
- BODY: none
- SUCCESS RESPONSE: `200 data.days[].lessons[]` مع `activeSession`
- ERRORS: auth errors, `INVALID_WEEK_START`, `STUDENT_PROFILE_NOT_FOUND`, `ACTION_DENIED`

### Student Join Lesson

- METHOD: `GET`
- PATH: `/api/v1/classrooms/:classroomId/sessions/active/join`
- AUTH: Student Bearer token
- BODY: none
- SUCCESS RESPONSE: `200` session details + `meetingLink`
- ERRORS: `ACTION_DENIED`, `SESSION_NOT_ACTIVE`, `CLASSROOM_ZOOM_NOT_CONFIGURED`

### Logout

- METHOD/PATH/AUTH/BODY/SUCCESS/ERRORS: `MISSING API`; احذف التوكنات محليًا فقط حاليًا

### Socket Events

- CONNECT AUTH: `auth.token=<access-token>`
- AUTO ROOM: `user_<userId>`
- EVENT: `notification`
- START PAYLOAD IDENTIFIER: `payload.key === 'CLASS_STARTED'`
- ACTION: refetch `/sessions/active` أو schedule؛ لا تفتح link من notification

## BACKEND GAPS FOR WEB PORTAL

### Critical

1. `BACKEND GAP: START LESSON TIME VALIDATION`: يمكن بدء أي حصة assigned في أي وقت؛ لا توجد occurrence identity أو duration/end time أو allowed window.
2. Teacher Start يعيد Zoom `join_url` وليس host `start_url`، ولا يوجد مسار آمن للحصول على host URL؛ لذلك فلو «المعلم يبدأ Zoom» غير مضمون بالكامل.
3. `starting` تعتبر joinable للطالب قبل webhook `meeting.started`؛ هذا يخالف الشرط الصارم «لا يدخل حتى تبدأ فعليًا».
4. `CLASS_STARTED` notification يضم meetingLink للParent رغم أن REST active-session يتعمد حجبه عنه.
5. Gulf schedule لا يعيد active session/live state، ولذلك يحتاج الويب طلب `/sessions/active` لكل Classroom أو Backend aggregation إضافية لإظهار live بكفاءة.
6. Teacher registration يصدر token لمعلم pending، بينما الحماية العامة لا تفحص Teacher approval؛ يجب توحيد approval enforcement أو عدم إصدار access token قابل للاستخدام قبل الموافقة.
7. Socket authentication لا يفحص User status أو تغيير password.

### Recommended

1. Current User endpoint موحد يعيد user/profile ids، role، User status، profile status، curriculum و`registrationMode(s)`.
2. Teacher schedule موحد يعيد المصري والخليجي بعقد occurrence واحد، مع date/endTime/duration/status/canStartNow.
3. Logout/token revocation أو refresh-token rotation persistence؛ الدوران الحالي يصدر refresh جديدًا لكنه لا يبطل القديم.
4. لا ترجع `zoomMeetingId` داخل Start session response إلا إذا احتاجه عميل موثوق.
5. وحّد error response بين development وproduction، ووحّد HTTP status لـ`CLASSROOM_ZOOM_NOT_CONFIGURED` (400 في Start، 409 في Join).
6. أضف Socket event مخصصًا لدورة Session أو حافظ على notification مع refetch إلزامي، مع إزالة Zoom URL من payload.

### Already Supported

1. Login موحد يعيد role، وStudent registrationMode، وTeacher registrationModes متعددة من التكليفات الفعلية.
2. Teacher registration وAdmin approval/rejection موجودان.
3. جداول Teacher منفصلة ومؤمنة للمصري والخليجي وتدعم عدة فصول/مواد/مناهج.
4. Egyptian Student digital schedule مؤمن بالـapproved enrollment ويعيد active session لدرس اليوم.
5. Start يتحقق من Teacher assignment للمادة والفصل ويمنع Session نشطة ثانية في الفصل.
6. Student Join endpoint موجود، ولا يعيد الرابط إلا لطالب enrolled approved في الفصل.
7. Session DB + Zoom webhooks يوفران lifecycle: starting/live/awaiting_zoom_end/ended.
8. Socket notification `CLASS_STARTED` موجود ومصادق عليه بالـJWT.

## الحكم النهائي

- **هل Web Portal المطلوب ممكن بالكامل بالـAPIs الحالية؟** لا. عرض الجداول، login، التسجيل، وJoin الأساسي ممكن، لكن شرط بدء الحصة في وقتها وبدء Zoom كـhost ومنع دخول الطالب قبل Zoom live غير مكتمل.
- **الـAPIs/العقود الناقصة:** لا يلزم اختراع paths الآن، لكن يلزم Backend contract لبدء occurrence مجدولة مع time validation، وآلية آمنة لإرجاع host start URL، وتحسين Current User، وتجميع Gulf active states؛ Logout API غير موجود.
- **أخطر Gap:** Start Lesson غير مرتبط بالجدول أو الوقت إطلاقًا. مباشرة بعده تأتي مشكلة أن الرابط المعاد للمعلم هو `join_url` لا `start_url`.

## Files inspected

### Application and routes

- `app.js`
- `server.js`
- `routes/authRoutes.js`
- `routes/userRoutes.js`
- `routes/teacherRoutes.js`
- `routes/studentRoutes.js`
- `routes/classroomRoutes.js`
- `routes/sessionRoutes.js`
- `routes/egyptianScheduleRoutes.js`
- `routes/gulfScheduleRoutes.js`
- `routes/notificationRoutes.js`
- `routes/zoomWebhookRoutes.js`

### Controllers

- `controllers/authController.js`
- `controllers/users/userController.js`
- `controllers/users/teacherController.js`
- `controllers/sessionController.js`
- `controllers/classrooms/egyptianScheduleController.js`
- `controllers/classrooms/gulfScheduleControlle.js`
- `controllers/zoomWebhookController.js`
- `controllers/notificationController.js`

### Services and authorization

- `services/teacherService.js`
- `services/registerService.js`
- `services/registrationPreparationService.js`
- `services/registrationCompletionService.js`
- `services/egyptianClassroomScheduleService.js`
- `services/gulfClassroomScheduleService.js`
- `services/common/teacherClassroomAccessService.js`
- `services/common/classroomAccessService.js`
- `services/common/studentAccessService.js`
- `services/zoom/sessionLifecycleService.js`
- `services/zoom/activeClassroomSessionService.js`
- `services/zoom/zoomWebhookService.js`
- `services/zoom/zoomApiService.js`
- `services/classroomCreationService.js`
- `services/gulfTeacherRequestService.js`
- `services/notifications/sessionLifecycleNotificationService.js`
- `services/notifications/notificationEventService.js`
- `services/notifications/resolvers/sessionResolver.js`
- `services/notifications/channels/socketChannel.js`
- `validators/classroomValidator.js`

### Models and middleware

- `models/users/userModel.js`
- `models/users/teacherModel.js`
- `models/users/studentModel.js`
- `models/curriculums/curriculumModel.js`
- `models/classrooms/classroomModel.js`
- `models/classrooms/classroomSubjectModel.js`
- `models/classrooms/classroomEnrollmentModel.js`
- `models/classrooms/egyptianScheduleModel.js`
- `models/classrooms/gulfScheduleModel.js`
- `models/sessionModel.js`
- `models/notificationModel.js`
- `middlewares/errorMiddleware.js`
- `middlewares/supervisorAccessMiddleware.js`
- `middlewares/filterMiddleware.js`
- `middlewares/teacherUploadMiddleware.js`

### Time, Zoom, Socket, and verification references

- `utils/cairoWeek.js`
- `utils/classroomPlanWeek.js`
- `utils/zoomMeetingLink.js`
- `utils/notification.js`
- `socket/socket.js`
- `socket/chat.socket.js`
- `test/authLoginResponse.test.js`
- `test/egyptianScheduleController.test.js`
- `test/egyptianDigitalSchedule.test.js`
- `test/sessionLifecycleService.test.js`
- `test/activeClassroomSessionService.test.js`
- `test/zoomWebhookService.test.js`
- `test/zoomMeetingCreation.test.js`
