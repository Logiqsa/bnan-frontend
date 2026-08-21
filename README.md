# BNAN Academy

منصة تعليمية للتعليم عن بعد وشرح أونلاين للمناهج السعودية والمصرية والخليجية.

الموقع الرسمي: https://bnanacademysa.com

## التطوير

```sh
npm install
npm run dev
```

## النشر على Cloudflare Pages

1. اربط المشروع بـ GitHub.
2. في Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. اختر الريبو، ثم استخدم الإعدادات التالية:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. أضف Environment Variables التالية (Production و Preview):
   - `NODE_VERSION` = `20`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
5. اضغط **Save and Deploy**.
6. لإضافة الدومين: Cloudflare Pages → **Custom domains** → أضف `bnanacademysa.com` و `www.bnanacademysa.com`.

### ملفات مهمة للنشر

- `public/_redirects` — SPA fallback لـ React Router.
- `public/_headers` — Security headers و caching policy.
- `.nvmrc` — يحدد Node.js version 20.

### الـ Backend

الـ Backend (Supabase Edge Functions، Database، Auth، Storage) مستضاف على Supabase ومنفصل تماماً عن Cloudflare. أي تعديل عليه يتم نشره مباشرة عبر Lovable.

## التقنيات

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, DB, Storage, Edge Functions)
