# VibeFarsi × Bug Arena

کامپوننت‌های راست‌چین و فارسی‌محور، اقتباس‌شده از [وایب‌فارسی](https://vibefarsi.ir)
بدون Tailwind — فقط با توکن‌های طراحی خود Bug Arena.

## رفتار دو زبانه

| حالت | جهت | فونت | ارقام |
|------|------|------|-------|
| `en` | LTR | Inter | لاتین |
| `fa` | RTL | Vazirmatn | فارسی (۰–۹) |

سوئیچ زبان از طریق `LanguageToggle` و `I18nProvider` بدون تغییر باقی می‌ماند.
استایل‌های فارسی فقط زیر `html[lang='fa']` اعمال می‌شوند.

## کامپوننت‌ها

```js
import {
  Button, Dialog, ToastProvider, useToast,
  Input, Field, Textarea,
  Alert, Badge, Progress,
  EmptyState, Skeleton, Switch,
  Card, Tabs, TabsList, TabsTrigger, TabsContent,
} from '../components/ui/vibefarsi'
```

## ابزارهای اعداد فارسی

```js
import { fa, faNumber, localizeNumber, faPercent, localizeDate } from '../../lib/vibefarsi-utils'
```

فقط وقتی `language === 'fa'` ارقام فارسی برمی‌گردند.

## قوانین

- از `left` / `right` استفاده نکنید — از ویژگی‌های منطقی (`inline-start` و …) استفاده کنید.
- متن UI از `t()` بیاید، نه هاردکد فارسی/انگلیسی.
- برای فیلد موبایل/ایمیل: `dir="ltr"`.
