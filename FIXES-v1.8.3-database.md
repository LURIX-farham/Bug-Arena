# Bug Arena v1.8.3.1 — ریشه‌یابی و رفع کامل مشکلات دیتابیس

این گزارش نتیجه‌ی بررسی عمیق و **بازتولید واقعی** هر دو خطای گزارش‌شده است:

1. `http://localhost/BugArena-v1.8.3/backend/public/health` → `{"ok":false,"error":"database_unavailable"}`
2. ثبت‌نام → `Authentication failed: Cannot reach Bug Arena API at http://localhost/BugArena-v1.8.3/backend/public. Failed to fetch`

هر دو خطا روی PHP 8.3 + MariaDB 11.8 بازتولید، اصلاح و دوباره تست شدند.

---

## ریشه‌یابی — سه مشکل واقعی

### مشکل ۱ — پورت اشتباه MySQL در فایل `.env` (علت مستقیم `database_unavailable`)

فایل `.env` همراه پکیج این مقادیر را داشت:

```env
BUGARENA_DB_HOST=127.0.0.1
BUGARENA_DB_PORT=33061     ← پورت محیط توسعه‌ی قبلی!
```

پورت `33061` روی هیچ نصب استاندارد WAMP/XAMPP وجود ندارد (پورت استاندارد MySQL همان **3306** است). نتیجه: PDO هرگز به سرور وصل نمی‌شد و همه‌ی endpointها — حتی `/health` — پاسخ `database_unavailable` می‌دادند.

نکته‌ی مهم: فایل `.env.example` درست بود (3306)، ولی `.env` واقعی که اولویت دارد، پورت اشتباه داشت. مقادیر داخل `.env` همیشه بر پیش‌فرض‌های `config.php` اولویت دارند، پس وجود همین یک خط، کل برنامه را از دسترس خارج می‌کرد.

**رفع:** `.env` بازنویسی شد با مقادیر استاندارد WAMP (`127.0.0.1:3306`، کاربر root بدون رمز) به‌همراه توضیح فارسی برای هر تنظیم.

### مشکل ۲ — وابستگی به import دستی schema در phpMyAdmin

حتی با پورت درست، اگر کاربر `backend/database/schema.sql` را در phpMyAdmin import نکرده بود، باز هم همان `database_unavailable` ظاهر می‌شد (تست شد: با پورت 3306 و بدون import → خطا؛ بعد از import → سالم). این قدم دستی، رایج‌ترین نقطه‌ی شکست نصب است.

**رفع (نصب خودکار):**
- کلاس جدید `backend/src/Core/DatabaseSetup.php`: در نصب‌های محلی، در اولین درخواست، دیتابیس `bug_arena` را می‌سازد، `schema.sql` را import می‌کند و اگر جدول چالش‌ها خالی بود `seed_challenges.sql` را هم اجرا می‌کند (۱۵ چالش + ۶۰ تست).
- کاملاً idempotent است: اگر دیتابیس و جداول از قبل موجود باشند، هیچ دستوری اجرا نمی‌شود و داده‌ها دست نمی‌خورند.
- با `BUGARENA_AUTO_SETUP=1` فعال می‌شود (پیش‌فرض) و در `BUGARENA_ENV=production` به‌صورت خودکار غیرفعال است.
- SQLها با یک parser داخلی (split ایمیل سمی‌کالن بیرون از رشته‌ها) statement به statement اجرا می‌شوند تا روی هر نسخه‌ای از pdo_mysql بدون اتکا به multi-statement کار کند.

- فایل نصب/پزشک جدید `backend/setup.php`: همان کار را به‌صورت دستی و با گزارش گام‌به‌گام انجام می‌دهد — از مرورگر (`http://localhost/BugArena-v1.8.3/backend/setup.php`) یا CLI (`php backend/setup.php`). خروجی فارسی، idempotent و در محیط production قفل است.

### مشکل ۳ — باگ معماری CORS: پیام واقعی سرور در مرورگر «Failed to fetch» می‌شد

این دقیقاً متن خطای دوم کاربر بود. زنجیره‌ی اتفاق:

1. `App::boot()` قبل از middlewareها `session_start()` را صدا می‌زند.
2. سشن‌ها در MySQL ذخیره می‌شوند (`DatabaseSessionHandler`)، پس `session_start` → اتصال دیتابیس.
3. چون دیتابیس در دسترس نبود، `Database::pdo()` وسط `session_start` پاسخ 503 را چاپ و با `exit` اجرای برنامه را قطع می‌کرد.
4. این پاسخ **قبل از** `CorsMiddleware` تولید شده بود، پس بدون هدر `Access-Control-Allow-Origin` بود.
5. مرورگر پاسخ بدون هدر CORS را بلاک می‌کند و `fetch` فقط یک `TypeError: Failed to fetch` می‌بیند — پیام واقعی سرور هیچ‌وقت به فرانت نمی‌رسید. برای همین پیام خطا «دو خطای متفاوت» به نظر می‌رسید در حالی که هر دو یک ریشه داشتند.

**رفع:**
- `CorsMiddleware::emitHeaders()` اضافه شد و در `App::boot()` **قبل از هر دسترسی به دیتابیس** هدرهای CORS (بر اساس Origin مجاز) ارسال می‌شوند.
- `session_start()` داخل `try/catch` رفت؛ اگر سشن به MySQL نرسد، پاسخ JSON تمیز 503 با هدرهای CORS برمی‌گردد نه کرش خام.
- در مسیر شکست `Database::pdo()` نیز هدرهای CORS صادر می‌شوند (حتی برای درخواست‌های بدون سشن).
- حالا `database_unavailable` فیلد `reason` دارد (در حالت debug) که علت دقیق را نشان می‌دهد:

```json
{"ok":false,"error":"database_unavailable","reason":"SQLSTATE[HY000] [2002] Connection refused"}
```

- خطای «Class not found» پنهانِ همین مسیر نیز رفع شد: فراخوانی `CorsMiddleware` داخل `Database.php` باید با namespace کامل (`\BugArena\Middleware\CorsMiddleware`) انجام می‌شد.

## تغییرات فایل‌ها

| فایل | تغییر |
|------|-------|
| `.env` | بازنویسی با مقادیر استاندارد WAMP (پورت 3306) + `BUGARENA_AUTO_SETUP=1` |
| `.env.example` | افزودن مستند `BUGARENA_AUTO_SETUP` |
| `backend/src/Core/DatabaseSetup.php` | جدید — ساخت خودکار DB + import schema/seed (idempotent) |
| `backend/setup.php` | جدید — نصب/پزشک دیتابیس برای مرورگر و CLI |
| `backend/src/Core/Database.php` | تلاش خودکار برای نصب در اولین اتصال، `lastError()`، خروجی 503 همراه CORS و `reason` |
| `backend/src/Core/App.php` | ارسال هدرهای CORS در boot، محافظت `session_start` با try/catch، `use Throwable` |
| `backend/src/Middleware/CorsMiddleware.php` | متد استاتیک `emitHeaders()` + اجازه‌ی هدر `X-CSRF-Token` در CORS |
| `backend/config/config.php` | کلید `auto_setup` (در production همیشه خاموش) |
| `README.md` / `backend/README.md` / `backend/database/README.md` | راهنمای نصب خودکار و عیب‌یابی جدید |

## نتایج تست (بازتولید و تأیید نهایی)

| سناریو | قبل | بعد |
|--------|-----|-----|
| `/health` با `.env` پورت 33061 | `{"ok":false,"error":"database_unavailable"}` | — (پورت اصلاح شد) |
| `/health` روی نصب کاملاً تازه (بدون DB و بدون import) | خطا | `{"ok":true,...}` و دیتابیس خودکار ساخته می‌شود |
| ثبت‌نام روی نصب تازه از مرورگر | `Failed to fetch` | `201 Created` + CORS |
| خاموش بودن کامل MySQL | مرورگر: `Failed to fetch` | مرورگر: پیام 503 واقعی با هدر CORS و `reason` |
| preflight OPTIONS با MySQL خاموش | — | `204` + هدرهای CORS کامل |
| login / me / challenges / leaderboard پس از نصب خودکار | — | همگی سالم |
| `backend/setup.php` (CLI و مرورگر) | — | نصب idempotent با گزارش فارسی |

## راه‌اندازی سریع (WAMP)

1. پوشه را در `C:\wamp64\www\BugArena-v1.8.3` قرار دهید (اسم پوشه مهم است چون آدرس API پیش‌فرض به آن وابسته است).
2. WAMP را روشن کنید (آیکون سبز) — MySQL و Apache فعال باشند.
3. اگر رمز MySQL دارید، در `.env` مقدار `BUGARENA_DB_PASSWORD` را تکمیل کنید.
4. `http://localhost/BugArena-v1.8.3/backend/public/health` را باز کنید — دفعه‌ی اول دیتابیس را خودش می‌سازد و `{"ok":true}` می‌دهد.
5. اگر خواستید مطمئن شوید: `http://localhost/BugArena-v1.8.3/backend/setup.php` گزارش نصب را نشان می‌دهد.
6. فرانت: `npm install && npm run dev` یا پوشه‌ی آماده `dist/`.

> اگر پوشه را با نام دیگری کپی می‌کنید، مقدار `VITE_API_BASE_URL` در `.env` را هماهنگ کنید و فرانت را دوباره build کنید.
