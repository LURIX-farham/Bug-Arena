# Bug Arena v1.8.3 — گزارش رفع اشکالات اتصال دیتابیس

این نسخه، تمام مشکلاتی که مانع اتصال برنامه به MySQL می‌شدند (و چند خطای مرتبط که در حین تست کشف شدند) را برطرف می‌کند. تمام موارد زیر روی PHP 8.3 + MariaDB 11.4 به‌صورت واقعی اجرا و تأیید شده‌اند.

## باگ‌های رفع‌شده

### ۱. کرش کامل Backend هنگام بوت (دلیل اصلی «اتصال به دیتابیس مشکل داره»)
`backend/src/Core/App.php`
کلاس `Autoloader` قبل از ثبت شدن autoloader فراخوانی می‌شد؛ در نتیجه PHP کلاس را پیدا نمی‌کرد و **همچین درخواستی با Fatal Error متوقف می‌شد** — هیچ endpointی جواب نمی‌داد و هیچ اتصالی به MySQL برقرار نمی‌شد.
رفع شد با `require_once __DIR__ . '/Autoloader.php'` قبل از `Autoloader::register()`.

### ۲. کلاس `CorsMiddleware` بدون import
`backend/src/Core/App.php`
`new CorsMiddleware(...)` بدون `use BugArena\Middleware\CorsMiddleware;` باعث `Class not found` می‌شد. import اضافه شد.

### ۳. Exceptionهای دیتابیس گرفته نمی‌شدند
`backend/src/Core/Router.php`
`catch (Throwable $e)` داخل namespace بدون `use Throwable` هرگز اجرا نمی‌شد (PHP به دنبال `\BugArena\Core\Throwable` می‌گشت). در نتیجه هر خطای PDO به‌جای پاسخ JSON تمیز، باعث Fatal 500 می‌شد. `use Throwable;` اضافه شد.

### ۴. فایل seed اصلاً import نمی‌شد
`backend/database/seed_challenges.sql`
- عبارت `CAST('...' AS JSON)` در MySQL 8 و MariaDB خطای syntax می‌دهد → به string literal ساده تبدیل شد.
- سینتکس `VALUES (...) AS new ON DUPLICATE KEY UPDATE col = new.col` فقط در MySQL ≥ 8.0.19 کار می‌کند و در MariaDB خطا می‌دهد → به فرمت سازگار `col = VALUES(col)` تبدیل شد.
حالا seed روی هر دو موتور دیتابیس اجرا می‌شود (۱۵ چالش + ۶۰ تست).

### ۵. خطای «Unknown column 'time_limit'» در ارزیابی دستاوردها
`backend/src/Services/AchievementService.php`
کوئری به ستون `time_limit` در جدول `submissions` ارجاع می‌داد که وجود ندارد؛ با JOIN به جدول `challenges` رفع شد.

### ۶. خرابی کامل `PUT /player`
`backend/src/Controllers/PlayerController.php`
کلاینت فقط `{username, displayName}` می‌فرستد، ولی کد بدون کلید `profile` باعث `preferred_language = NULL` و خطای دیتابیس می‌شد. حالا پروفایل فقط وقتی ارسال شده باشد آپدیت می‌شود.

### ۷. ثبت مسابقات کاملاً خراب بود
`backend/src/Services/RatingService.php`
- متغیر `$pdo` در closure تعریف نشده بود → Fatal error.
- **`lastInsertId()` بعد از دستورات UPDATE خوانده می‌شد که آن را صفر می‌کند** → `match_id = 0` → خطای FK در جدول `ratings`. مقدار اکنون بلافاصله بعد از INSERT گرفته می‌شود.
- متغیرهای `$opponent` و `$opponentRating` در لیست `use` closure نبودند → نام/امتیاز حریف null برمی‌گشت.

### ۸. همگام‌سازی آفلاین خراب بود
`backend/src/Controllers/SyncController.php`
- تایپ `PLAYER_UPDATED` که کلاینت ارسال می‌کند در لیست تایپ‌های مجاز نبود → همیشه reject می‌شد. پردازشگر آن اضافه شد.
- کلاینت برای `REPLAY_FINISHED` کلید `sessionId` می‌فرستد ولی سرور فقط `id` را می‌پذیرفت → اکنون هر دو کلید پذیرفته می‌شوند.

### ۹. آدرس API قدیمی
`src/services/apiClient.js`، `.env.example`، `README.md`ها و فایل build شده `dist/`
آدرس پیش‌فرض به پوشه `BugArena-v1.8.1` اشاره می‌کرد در حالی که این نسخه `v1.8.3` است → همه به `v1.8.3` به‌روزرسانی شدند. اگر نام پوشه شما متفاوت است، در فایل `.env` مقدار `VITE_API_BASE_URL` را تغییر دهید.

### ۱۰. فایل `.env` آماده
یک `.env` با تنظیمات پیش‌فرض WAMP (root بدون رمز، دیتابیس `bug_arena`) اضافه شد. اگر رمز MySQL دارید، `BUGARENA_DB_PASSWORD` را تکمیل کنید.

## راه‌اندازی سریع (WAMP)

1. پوشه را در `C:\wamp64\www\BugArena-v1.8.3` قرار دهید.
2. phpMyAdmin → import فایل `backend/database/schema.sql` و سپس `backend/database/seed_challenges.sql`.
3. mod_rewrite در Apache فعال باشد.
4. Backend: `http://localhost/BugArena-v1.8.3/backend/public/health` باید `{"ok":true,...}` برگرداند.
5. Frontend: `npm install && npm run dev` یا استفاده از پوشه آماده `dist/`.
