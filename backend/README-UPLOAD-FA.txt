Bug Arena — بک‌اند کامل (همه اصلاحات تا الان)
================================================

محتوای این پوشه = کل backend آماده آپلود روی هاست.

مسیر روی هاست:
  محتویات این زیپ → public_html/api/

ساختار نهایی باید این باشد:
  public_html/api/
    .htaccess
    public/index.php
    src/...
    routes/api.php
    config/config.php
    database/...
    logs/

مهم:
1) فایل public_html/.env را عوض نکن (اطلاعات DB و CORS)
2) اگر config.php هاست اطلاعات DB درست دارد، آن را نگه دار
   و فقط اگر خراب است از config این بسته استفاده کن
3) بعد از آپلود تست کن:
     https://bugarena.ir/api/health
     https://bugarena.ir/api/auth/me

اصلاحات داخل این بسته:
- مسیر /api (App::resolveRequestPath)
- Database::applySessionDefaults + timezone UTC
- Auth isAdmin + rank بدون ادمین در لیدربورد
- POST /execute (PythonRunner)
- Submit با اعتبارسنجی سرور + ScoringService منعطف
- Admin dashboard APIs
- Replay rate-limit بالاتر

فرانت را جداگانه بیلد کن:
  VITE_API_BASE_URL=https://bugarena.ir/api npm run build
